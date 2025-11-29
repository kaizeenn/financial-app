const db = require('../config/db');
const cron = require('node-cron');

/**
 * Process recurring transactions that are due to run
 * This function should be called by a cron job daily at 00:00
 */
async function processRecurringTransactions() {
  try {
    console.log('Processing recurring transactions...');

    // Get all active recurring transactions that are due
    const [dueRecurring] = await db.query(
      'SELECT * FROM recurring_transactions WHERE active = 1 AND next_run_date <= CURDATE()'
    );

    console.log(`Found ${dueRecurring.length} recurring transactions to process`);

    for (const recurring of dueRecurring) {
      try {
        // Insert transaction based on type
        if (recurring.type === 'income') {
          await db.query(
            `INSERT INTO income (user_id, category_id, account_id, amount, description, entry_date, payment_method_id)
             VALUES (?, ?, ?, ?, ?, CURDATE(), ?)`,
            [
              recurring.user_id,
              recurring.category_id,
              recurring.account_id,
              recurring.amount,
              recurring.description || `Transaksi berulang: ${recurring.description || 'Pemasukan otomatis'}`,
              recurring.payment_method_id || null
            ]
          );
        } else if (recurring.type === 'expense') {
          await db.query(
            `INSERT INTO expense (user_id, category_id, account_id, amount, description, entry_date, payment_method_id)
             VALUES (?, ?, ?, ?, ?, CURDATE(), ?)`,
            [
              recurring.user_id,
              recurring.category_id,
              recurring.account_id,
              recurring.amount,
              recurring.description || `Transaksi berulang: ${recurring.description || 'Pengeluaran otomatis'}`,
              recurring.payment_method_id || null
            ]
          );
        }

        // Calculate next run date
        let nextRunDate = new Date(recurring.next_run_date);

        switch (recurring.frequency) {
          case 'daily':
            nextRunDate.setDate(nextRunDate.getDate() + 1);
            break;
          case 'weekly':
            nextRunDate.setDate(nextRunDate.getDate() + 7);
            break;
          case 'monthly':
            nextRunDate.setMonth(nextRunDate.getMonth() + 1);
            break;
          case 'yearly':
            nextRunDate.setFullYear(nextRunDate.getFullYear() + 1);
            break;
        }

        // Update next_run_date
        await db.query(
          'UPDATE recurring_transactions SET next_run_date = ? WHERE id = ?',
          [nextRunDate.toISOString().split('T')[0], recurring.id]
        );

        console.log(`Processed recurring transaction ${recurring.id} (${recurring.type})`);
      } catch (error) {
        console.error(`Error processing recurring transaction ${recurring.id}:`, error);
      }
    }

    console.log('Recurring transactions processing completed');
  } catch (error) {
    console.error('Error in processRecurringTransactions:', error);
  }
}

/**
 * Start the cron job for processing recurring transactions
 * Runs every day at 00:00 (midnight)
 */
function startRecurringCronJob() {
  // Schedule to run every day at 00:00
  cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled recurring transactions processing...');
    processRecurringTransactions();
  });

  console.log('Recurring transactions cron job started (runs daily at 00:00)');
}

/**
 * Manual trigger for testing purposes
 */
async function triggerRecurringProcessing() {
  console.log('Manually triggering recurring transactions processing...');
  await processRecurringTransactions();
}

module.exports = {
  processRecurringTransactions,
  startRecurringCronJob,
  triggerRecurringProcessing
};
