#!/usr/bin/env node
/**
 * Migration script: GoldAPI -> MetalPriceAPI
 * Actions:
 * 1. Add column input_unit to investment_portfolio (if not exists)
 * 2. Update provider_source from 'goldapi' to 'yellow_metal'
 */
const db = require('../config/db');

async function columnExists() {
  const [rows] = await db.query("SHOW COLUMNS FROM investment_portfolio LIKE 'input_unit'");
  return rows.length > 0;
}

async function addColumn() {
  console.log('Adding column input_unit ...');
  await db.query("ALTER TABLE investment_portfolio ADD COLUMN input_unit VARCHAR(20) NULL AFTER amount");
  console.log('Column input_unit added.');
}

async function updateProviderSource() {
  console.log("Updating provider_source 'goldapi' -> 'yellow_metal' ...");
  const [result] = await db.query("UPDATE investment_assets SET provider_source='yellow_metal' WHERE provider_source='goldapi'");
  console.log(`Updated rows: ${result.affectedRows}`);
}

async function run() {
  try {
    const hasCol = await columnExists();
    if (!hasCol) await addColumn(); else console.log('Column input_unit already exists, skip.');
    await updateProviderSource();
    console.log('Migration completed successfully.');
    process.exit(0);
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  }
}
run();
