/**
 * InsightsService - Takeout spending analysis
 * Based on actual transaction structure from TransactionCard
 */

class InsightsService {
  /**
   * Generate insights based on actual transaction data
   */
  static generateInsights(
    categoryData,
    currentPeriod,
    previousPeriod = null,
    currentTransactions = [],
    previousTransactions = [],
    selectedPeriod = 'weekly',
  ) {
    const insights = [];

    // Takeout comparison insight using previous period data
    const takeoutInsight = this.analyzeTakeoutSpending(
      currentTransactions,
      previousTransactions,
      selectedPeriod,
    );
    if (takeoutInsight) {
      insights.push(takeoutInsight);
    }

    return insights;
  }

  /**
   * Analyze takeout spending with proper comparison to previous period
   */
  static analyzeTakeoutSpending(
    currentTransactions,
    previousTransactions,
    selectedPeriod,
  ) {
    // Get current period takeout data
    const currentTakeoutData = this.getTakeoutData(currentTransactions);

    if (currentTakeoutData.count === 0) {
      return null; // No takeout in current period
    }

    // Get previous period takeout data for comparison
    const previousTakeoutData = this.getTakeoutData(previousTransactions);

    // Generate insight based on comparison
    return this.generateTakeoutComparisonInsight(
      currentTakeoutData,
      previousTakeoutData,
      selectedPeriod,
    );
  }

  /**
   * Extract takeout data from transactions
   */
  static getTakeoutData(transactions) {
    // Filter for food category transactions first
    const foodTransactions = transactions.filter(transaction => {
      return transaction.category === 'food';
    });

    if (foodTransactions.length === 0) {
      return {count: 0, spending: 0, totalFood: 0};
    }

    // From food transactions, identify takeout/delivery based on description
    const takeoutKeywords = [
      'uber eats',
      'ubereats',
      'uber',
      'doordash',
      'dash',
      'menulog',
      'deliveroo',
      'grubhub',
      'delivery',
      'takeaway',
      'takeout',
      'food delivery',
      'eats',
    ];

    const takeoutTransactions = foodTransactions.filter(transaction => {
      if (!transaction.description) {
        return false;
      }

      const description = transaction.description.toLowerCase();
      return takeoutKeywords.some(keyword => description.includes(keyword));
    });

    const takeoutSpending = takeoutTransactions.reduce((sum, transaction) => {
      return sum + (transaction.amount || 0);
    }, 0);

    const totalFoodSpending = foodTransactions.reduce((sum, transaction) => {
      return sum + (transaction.amount || 0);
    }, 0);

    return {
      count: takeoutTransactions.length,
      spending: takeoutSpending,
      totalFood: totalFoodSpending,
    };
  }

  /**
   * Generate meaningful takeout comparison insight
   */
  static generateTakeoutComparisonInsight(
    currentData,
    previousData,
    selectedPeriod,
  ) {
    const periodLabel = this.getPeriodLabel(selectedPeriod);

    // Calculate current takeout percentage
    const currentPercentage =
      currentData.totalFood > 0
        ? (currentData.spending / currentData.totalFood) * 100
        : 0;

    // If no previous data, show basic insight
    if (previousData.count === 0) {
      if (currentData.count === 0) {
        return null; // No takeout in either period
      }

      // For daily: if no previous day takeout, don't show insight
      if (selectedPeriod === 'daily') {
        return null; // No comparison possible, skip insight
      }

      return {
        type: 'info',
        icon: 'restaurant-outline',
        category: 'Takeout Trend',
        message: `${currentData.count} takeout order${
          currentData.count !== 1 ? 's' : ''
        } this ${periodLabel} (first time spending on takeout in ${this.getMonthName(
          selectedPeriod,
        )})`,
        suggestion: 'New takeout spending this period',
      };
    }

    // Calculate previous takeout percentage
    const previousPercentage =
      previousData.totalFood > 0
        ? (previousData.spending / previousData.totalFood) * 100
        : 0;

    // Calculate changes
    const percentageChange = currentPercentage - previousPercentage;
    // eslint-disable-next-line no-unused-vars
    const orderChange = currentData.count - previousData.count;

    let message = '';
    let suggestion = '';
    let type = 'info';

    // Daily-specific logic
    if (selectedPeriod === 'daily') {
      if (currentData.count === 0) {
        return {
          type: 'success',
          icon: 'restaurant-outline',
          category: 'Takeout Trend',
          message: 'No takeout orders today (had takeout yesterday)',
          suggestion: 'Great job cooking at home today!',
        };
      }

      if (Math.abs(percentageChange) < 10) {
        message = `${currentPercentage.toFixed(
          0,
        )}% of food spending (similar to yesterday)`;
        suggestion = 'Consistent with yesterday - maintaining balance';
      } else if (percentageChange > 20) {
        type = 'warning';
        message = `${currentPercentage.toFixed(
          0,
        )}% of food spending (up from ${previousPercentage.toFixed(
          0,
        )}% yesterday)`;
        suggestion =
          'Higher takeout spending than yesterday - consider cooking dinner';
      } else if (percentageChange < -20) {
        type = 'success';
        message = `${currentPercentage.toFixed(
          0,
        )}% of food spending (down from ${previousPercentage.toFixed(
          0,
        )}% yesterday)`;
        suggestion = 'Less takeout than yesterday - nice improvement!';
      } else if (percentageChange > 0) {
        message = `${currentPercentage.toFixed(
          0,
        )}% of food spending (up from ${previousPercentage.toFixed(
          0,
        )}% yesterday)`;
        suggestion = 'Slightly more takeout than yesterday';
      } else {
        message = `${currentPercentage.toFixed(
          0,
        )}% of food spending (down from ${previousPercentage.toFixed(
          0,
        )}% yesterday)`;
        suggestion = 'Less takeout than yesterday - good progress';
      }
    }
    // Weekly-specific logic
    else if (selectedPeriod === 'weekly') {
      if (Math.abs(percentageChange) < 5) {
        message = `${currentPercentage.toFixed(
          0,
        )}% of food budget (similar to last week)`;
        suggestion = 'Consistent takeout habits week-to-week';
      } else if (percentageChange > 15) {
        type = 'warning';
        message = `${currentPercentage.toFixed(
          0,
        )}% of food budget (up from ${previousPercentage.toFixed(
          0,
        )}% last week)`;
        suggestion =
          'Takeout increased significantly - try meal prep this week';
      } else if (percentageChange < -15) {
        type = 'success';
        message = `${currentPercentage.toFixed(
          0,
        )}% of food budget (down from ${previousPercentage.toFixed(
          0,
        )}% last week)`;
        suggestion = 'Great job reducing takeout! Keep up the cooking streak';
      } else if (percentageChange > 0) {
        message = `${currentPercentage.toFixed(
          0,
        )}% of food budget (up from ${previousPercentage.toFixed(
          0,
        )}% last week)`;
        suggestion = 'Takeout increased slightly from last week';
      } else {
        message = `${currentPercentage.toFixed(
          0,
        )}% of food budget (down from ${previousPercentage.toFixed(
          0,
        )}% last week)`;
        suggestion = 'Nice improvement from last week!';
      }
    }
    // Monthly-specific logic
    else if (selectedPeriod === 'monthly') {
      if (Math.abs(percentageChange) < 5) {
        message = `${currentPercentage.toFixed(
          0,
        )}% of food budget (similar to last month)`;
        suggestion = 'Consistent monthly takeout spending patterns';
      } else if (percentageChange > 10) {
        type = 'warning';
        message = `${currentPercentage.toFixed(
          0,
        )}% of food budget (up from ${previousPercentage.toFixed(
          0,
        )}% last month)`;
        suggestion =
          'Monthly takeout increased - consider meal planning strategies';
      } else if (percentageChange < -10) {
        type = 'success';
        message = `${currentPercentage.toFixed(
          0,
        )}% of food budget (down from ${previousPercentage.toFixed(
          0,
        )}% last month)`;
        suggestion = 'Excellent monthly improvement in cooking habits!';
      } else if (percentageChange > 0) {
        message = `${currentPercentage.toFixed(
          0,
        )}% of food budget (up from ${previousPercentage.toFixed(
          0,
        )}% last month)`;
        suggestion = 'Slight increase from last month';
      } else {
        message = `${currentPercentage.toFixed(
          0,
        )}% of food budget (down from ${previousPercentage.toFixed(
          0,
        )}% last month)`;
        suggestion = 'Good monthly progress on cooking more!';
      }
    }

    return {
      type,
      icon: 'restaurant-outline',
      category: 'Takeout Trend',
      message,
      suggestion,
    };
  }

  /**
   * Helper to get period label
   */
  static getPeriodLabel(selectedPeriod) {
    switch (selectedPeriod) {
      case 'daily':
        return 'day';
      case 'weekly':
        return 'week';
      case 'monthly':
        return 'month';
      default:
        return 'period';
    }
  }

  /**
   * Helper to get month name for display
   */
  static getMonthName(selectedPeriod) {
    if (selectedPeriod === 'monthly') {
      const currentDate = new Date();
      return currentDate.toLocaleDateString('en-US', {month: 'long'});
    }
    return 'this period';
  }

  // Keep existing helper methods for compatibility
  static getTransactionsForPeriod(
    allTransactions,
    period,
    selectedPeriod,
    isRecurringTransaction,
  ) {
    if (!period || !allTransactions.length) {
      return [];
    }

    if (selectedPeriod === 'daily' && period.date) {
      return allTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return (
          transactionDate.getDate() === period.date.getDate() &&
          transactionDate.getMonth() === period.date.getMonth() &&
          transactionDate.getFullYear() === period.date.getFullYear() &&
          !isRecurringTransaction(t)
        );
      });
    } else if (
      selectedPeriod === 'weekly' &&
      period.startDate &&
      period.endDate
    ) {
      return allTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return (
          transactionDate >= period.startDate &&
          transactionDate <= period.endDate &&
          !isRecurringTransaction(t)
        );
      });
    } else if (selectedPeriod === 'monthly' && period.monthDate) {
      return allTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return (
          transactionDate.getMonth() === period.monthDate.getMonth() &&
          transactionDate.getFullYear() === period.monthDate.getFullYear() &&
          !isRecurringTransaction(t)
        );
      });
    }

    return [];
  }

  static calculatePreviousPeriod(currentPeriod, selectedPeriod) {
    if (!currentPeriod) {
      return null;
    }

    if (selectedPeriod === 'daily' && currentPeriod.date) {
      const previousDate = new Date(currentPeriod.date);
      previousDate.setDate(previousDate.getDate() - 1);
      return {
        ...currentPeriod,
        date: previousDate,
      };
    } else if (
      selectedPeriod === 'weekly' &&
      currentPeriod.startDate &&
      currentPeriod.endDate
    ) {
      const previousStartDate = new Date(currentPeriod.startDate);
      const previousEndDate = new Date(currentPeriod.endDate);
      previousStartDate.setDate(previousStartDate.getDate() - 7);
      previousEndDate.setDate(previousEndDate.getDate() - 7);
      return {
        ...currentPeriod,
        startDate: previousStartDate,
        endDate: previousEndDate,
      };
    } else if (selectedPeriod === 'monthly' && currentPeriod.monthDate) {
      const previousMonthDate = new Date(currentPeriod.monthDate);
      previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
      return {
        ...currentPeriod,
        monthDate: previousMonthDate,
      };
    }

    return null;
  }
}

export default InsightsService;
