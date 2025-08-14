// services/TournamentCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'tournaments_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes (shorter TTL since tournaments change frequently)

class TournamentCache {
  /**
   * Get cached tournament data
   * @returns {Promise<{data: array, timestamp: number, age: number, isStale: boolean} | null>}
   */
  async get() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) {
        return null;
      }

      const {data, timestamp} = JSON.parse(cached);
      const age = Date.now() - timestamp;
      const isStale = age > CACHE_TTL;

      console.log('🎲 TournamentCache: Retrieved cache', {
        age: Math.round(age / 1000 / 60), // minutes
        isStale,
        tournamentCount: data?.length || 0,
        tournaments: data?.map(t => ({id: t.id, name: t.name})) || [],
      });

      return {
        data: data || [],
        timestamp,
        age,
        isStale,
      };
    } catch (error) {
      console.error('🎲 TournamentCache: Get error:', error);
      return null;
    }
  }

  /**
   * Set tournament data in cache
   * @param {array} data - Tournament data to cache
   * @returns {Promise<boolean>}
   */
  async set(data) {
    try {
      const cacheData = {
        data: data || [],
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('🎲 TournamentCache: Data cached successfully', {
        timestamp: cacheData.timestamp,
        tournamentCount: data?.length || 0,
        tournaments: data?.map(t => ({id: t.id, name: t.name})) || [],
        dataSize: JSON.stringify(data).length,
      });
      return true;
    } catch (error) {
      console.error('🎲 TournamentCache: Set error:', error);
      return false;
    }
  }

  /**
   * Clear tournament cache
   * @returns {Promise<boolean>}
   */
  async clear() {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      console.log('🎲 TournamentCache: Cache cleared');
      return true;
    } catch (error) {
      console.error('🎲 TournamentCache: Clear error:', error);
      return false;
    }
  }

  /**
   * Check if cached data exists and is fresh
   * @returns {Promise<boolean>}
   */
  async isFresh() {
    const cached = await this.get();
    return cached && !cached.isStale;
  }

  /**
   * Get cache age in minutes
   * @returns {Promise<number | null>}
   */
  async getAge() {
    const cached = await this.get();
    return cached ? Math.round(cached.age / 1000 / 60) : null;
  }

  /**
   * Invalidate cache by setting timestamp to 0
   * This keeps the data but marks it as stale for background refresh
   * @returns {Promise<boolean>}
   */
  async invalidate() {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const {data} = JSON.parse(cached);
        const cacheData = {
          data: data || [],
          timestamp: 0, // Mark as stale but keep data
        };

        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        console.log('🎲 TournamentCache: Cache invalidated');
        return true;
      }
      return false;
    } catch (error) {
      console.error('🎲 TournamentCache: Invalidate error:', error);
      return false;
    }
  }

  /**
   * Get cache statistics for debugging
   * @returns {Promise<object>}
   */
  async getStats() {
    try {
      const cached = await this.get();
      if (!cached) {
        return {
          exists: false,
          age: null,
          isStale: null,
          size: null,
          tournamentCount: 0,
        };
      }

      const size = JSON.stringify(cached.data).length;

      return {
        exists: true,
        age: Math.round(cached.age / 1000 / 60), // minutes
        isStale: cached.isStale,
        size,
        ttlMinutes: CACHE_TTL / 1000 / 60,
        lastUpdated: new Date(cached.timestamp).toISOString(),
        tournamentCount: cached.data?.length || 0,
        tournaments:
          cached.data?.map(t => ({
            id: t.id,
            name: t.name,
            status: this._getTournamentStatus(t),
          })) || [],
      };
    } catch (error) {
      console.error('🎲 TournamentCache: Stats error:', error);
      return {
        exists: false,
        error: error.message,
        tournamentCount: 0,
      };
    }
  }

  /**
   * Add or update a tournament in cache
   * Useful for optimistic updates after creation/editing
   * @param {object} tournament - Tournament data to add/update
   * @returns {Promise<boolean>}
   */
  async upsertTournament(tournament) {
    try {
      const cached = await this.get();
      let tournaments = cached?.data || [];

      // Find existing tournament by ID
      const existingIndex = tournaments.findIndex(t => t.id === tournament.id);

      if (existingIndex >= 0) {
        // Update existing tournament
        tournaments[existingIndex] = {
          ...tournaments[existingIndex],
          ...tournament,
        };
        console.log(
          '🎲 TournamentCache: Tournament updated in cache:',
          tournament.name,
        );
      } else {
        // Add new tournament
        tournaments.push(tournament);
        console.log(
          '🎲 TournamentCache: Tournament added to cache:',
          tournament.name,
        );
      }

      return await this.set(tournaments);
    } catch (error) {
      console.error('🎲 TournamentCache: Upsert error:', error);
      return false;
    }
  }

  /**
   * Remove a tournament from cache
   * @param {string|number} tournamentId - ID of tournament to remove
   * @returns {Promise<boolean>}
   */
  async removeTournament(tournamentId) {
    try {
      const cached = await this.get();
      let tournaments = cached?.data || [];

      const filteredTournaments = tournaments.filter(
        t => t.id !== tournamentId,
      );

      if (filteredTournaments.length !== tournaments.length) {
        console.log(
          '🎲 TournamentCache: Tournament removed from cache:',
          tournamentId,
        );
        return await this.set(filteredTournaments);
      }

      console.log(
        '🎲 TournamentCache: Tournament not found in cache:',
        tournamentId,
      );
      return true;
    } catch (error) {
      console.error('🎲 TournamentCache: Remove error:', error);
      return false;
    }
  }

  /**
   * Helper method to determine tournament status
   * @private
   * @param {object} tournament - Tournament object
   * @returns {string} - Status: 'upcoming', 'active', 'completed'
   */
  _getTournamentStatus(tournament) {
    if (!tournament.dateStart) {
      return 'upcoming';
    }

    const now = new Date();
    const start = new Date(tournament.dateStart);
    const end = tournament.dateEnd ? new Date(tournament.dateEnd) : start;

    if (now >= start && now <= end) {
      return 'active';
    } else if (now > end) {
      return 'completed';
    } else {
      return 'upcoming';
    }
  }
}

// Export singleton instance (following existing cache pattern)
const tournamentCache = new TournamentCache();
export default tournamentCache;
