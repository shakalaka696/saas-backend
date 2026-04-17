const { DataSource } = require('typeorm');
require('dotenv').config();
const { TenantSchema, AdminSchema, CustomerSchema, OTPSchema, SegmentSchema, EmailCampaignSchema, CampaignJobSchema } = require('../models/entities');

const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true, // This builds the tables for you!
  ssl: { rejectUnauthorized: false },
  entities : [TenantSchema, AdminSchema, CustomerSchema, OTPSchema, SegmentSchema, EmailCampaignSchema, CampaignJobSchema]
});

module.exports = { AppDataSource };