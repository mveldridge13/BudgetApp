// Add this as a separate utility file: src/utils/awsDebugHelper.js

export class AWSDebugHelper {
  static async validateAWSConfiguration() {
    try {
      console.log('🔍 Starting AWS configuration validation...');

      // Check if Amplify is configured
      const {Amplify} = await import('aws-amplify');
      const config = Amplify.getConfig();

      console.log('📋 Amplify Configuration:', {
        auth: !!config.Auth,
        storage: !!config.Storage,
        region: config.Auth?.region || 'Not set',
      });

      // Check authentication status
      const {fetchAuthSession, getCurrentUser} = await import(
        'aws-amplify/auth'
      );

      try {
        const user = await getCurrentUser();
        console.log('👤 Current User:', {
          username: user.username,
          userId: user.userId,
        });
      } catch (userError) {
        console.log('👤 No current user:', userError.message);
      }

      // Check AWS session
      try {
        const session = await fetchAuthSession();
        console.log('🔑 AWS Session Status:', {
          hasCredentials: !!session.credentials,
          hasTokens: !!session.tokens,
          identityId: session.identityId,
          credentialsExpiry: session.credentials?.expiration?.toISOString(),
          tokenExpiry: session.tokens?.accessToken?.payload?.exp
            ? new Date(
                session.tokens.accessToken.payload.exp * 1000,
              ).toISOString()
            : 'Unknown',
        });

        return {
          isValid: !!(session.credentials && session.identityId),
          session,
          config,
        };
      } catch (sessionError) {
        console.error('❌ Session validation failed:', sessionError);
        return {
          isValid: false,
          error: sessionError.message,
          config,
        };
      }
    } catch (error) {
      console.error('❌ AWS configuration validation failed:', error);
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  static async refreshAWSCredentials(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        console.log(
          `🔄 Refreshing AWS credentials (attempt ${i + 1}/${maxRetries})...`,
        );

        const {fetchAuthSession} = await import('aws-amplify/auth');
        const session = await fetchAuthSession({forceRefresh: true});

        if (session.credentials && session.identityId) {
          console.log('✅ Credentials refreshed successfully');
          return session;
        } else {
          throw new Error('Invalid session after refresh');
        }
      } catch (error) {
        console.log(`❌ Refresh attempt ${i + 1} failed:`, error.message);
        if (i === maxRetries - 1) {
          throw error;
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  static async testS3Access(bucketName, testKey = 'test-access.json') {
    try {
      console.log(`🧪 Testing S3 access to bucket: ${bucketName}`);

      const {uploadData, downloadData, remove} = await import(
        'aws-amplify/storage'
      );

      const testData = {
        timestamp: new Date().toISOString(),
        test: 'S3 access test',
      };

      // Test upload
      const uploadResult = await uploadData({
        key: testKey,
        data: JSON.stringify(testData),
      }).result;

      console.log('✅ S3 Upload successful:', uploadResult.key);

      // Test download
      const downloadResult = await downloadData({
        key: testKey,
      }).result;

      const downloadedData = await downloadResult.body.text();
      console.log('✅ S3 Download successful:', JSON.parse(downloadedData));

      // Clean up
      await remove({key: testKey});
      console.log('✅ S3 Cleanup successful');

      return {success: true, message: 'S3 access test passed'};
    } catch (error) {
      console.error('❌ S3 access test failed:', error);
      return {
        success: false,
        error: error.message,
        details: error,
      };
    }
  }
}

// Usage example - add this to your App.js initialization:
/*
import { AWSDebugHelper } from './src/utils/awsDebugHelper';

// In your useEffect after auth initialization:
if (auth.isLoggedIn) {
  setTimeout(async () => {
    const validation = await AWSDebugHelper.validateAWSConfiguration();
    console.log('🔍 AWS Validation Result:', validation);

    if (!validation.isValid && validation.error.includes('NotAuthorized')) {
      console.log('🔄 Attempting credential refresh...');
      try {
        await AWSDebugHelper.refreshAWSCredentials();
        console.log('✅ Credentials refreshed, retrying validation...');
        const retryValidation = await AWSDebugHelper.validateAWSConfiguration();
        console.log('🔍 Retry Validation Result:', retryValidation);
      } catch (refreshError) {
        console.error('❌ Credential refresh failed:', refreshError);
      }
    }
  }, 2000);
}
*/
