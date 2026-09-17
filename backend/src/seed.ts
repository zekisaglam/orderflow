import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Campaign } from './models/Campaign';

dotenv.config();

type ClientSeed = {
  clientId: string;
  names: string[];
};

const CLIENTS: ClientSeed[] = [
  {
    // E-commerce / retail brand
    clientId: 'clientA',
    names: [
      'Summer Sale 2026',
      'Black Friday Doorbusters',
      'Free Shipping Weekend',
      'Cyber Monday Flash Sale',
      'Back to School Essentials',
      'Holiday Gift Guide',
      'Spring Clearance Event',
      "Valentine's Day Specials",
      'Memorial Day Weekend Sale',
      'Labor Day Savings',
      'Always-On Retargeting',
      'Brand Search Protection',
      'New Customer Acquisition',
      'Abandoned Cart Recovery',
      'Loyalty Rewards Promotion',
      'Product Launch - Spring Collection',
      'Category Prospecting - Apparel',
      'Dynamic Product Ads - Catalog',
      'Influencer Collab - Q3',
      'Email Retargeting - Warm Leads',
    ],
  },
  {
    // B2B SaaS company
    clientId: 'clientB',
    names: [
      'Q4 Enterprise Outreach',
      'Free Trial Signup Push',
      'LinkedIn Lead Gen - Finance Sector',
      'Webinar Registration - Product Launch',
      'Branded Search - Always On',
      'Q1 Pipeline Acceleration',
      'Demo Request Campaign',
      'Competitor Conquesting',
      'ABM - Healthcare Vertical',
      'Case Study Content Promotion',
      'Retargeting - Trial Abandoners',
      'G2 Reviews Campaign',
      'Gartner Report Download Push',
      'Customer Advocacy Program',
      'Partner Co-Marketing - Q3',
      'Series B Announcement Push',
      'Integration Launch - Salesforce',
      'Year-End Budget Flush Outreach',
    ],
  },
  {
    // Restaurant / food chain
    clientId: 'clientC',
    names: [
      'Weekend Brunch Promo',
      'New Menu Launch - Fall',
      'Delivery App Partnership Push',
      'Loyalty App Signup',
      'Happy Hour Awareness',
      'Holiday Catering Push',
      'Grand Opening - New Location',
      'Summer Patio Season',
      'Family Meal Bundle Promo',
      'Late Night Delivery Push',
      'Seasonal Menu - Pumpkin Spice',
      'Game Day Specials',
      'Kids Eat Free Promotion',
      'Local Community Sponsorship',
      'Mobile App Reorder Reminder',
    ],
  },
  {
    // Fitness / wellness app
    clientId: 'clientD',
    names: [
      'New Year Resolution Push',
      'Referral Program Boost',
      'App Store Optimization Campaign',
      'Summer Fitness Challenge',
      'Free Trial - 7 Day Push',
      'Winter Wellness Reset',
      'Influencer Partnership - Fitness',
      'Retargeting - Trial Expired Users',
      'Holiday Season Guilt Marketing',
      'New Feature Launch - Meal Tracking',
      'Spring Shred Challenge',
      'Corporate Wellness Partnerships',
      'App Store Reviews Push',
      'Push Notification Re-engagement',
      'Black Friday Annual Plan Discount',
      'Community Challenge - Step Count',
      'Referral Bonus - Double Points',
      'Back to School Fitness Reset',
      'YouTube Pre-roll - Workout Content',
      'Podcast Sponsorship - Health Niche',
      'Apple Watch Integration Launch',
      'Beach Body Countdown',
    ],
  },
  {
    // Local home services business
    clientId: 'clientE',
    names: [
      'Spring Maintenance Special',
      'Google Local Services Boost',
      'Neighborhood Referral Program',
      'Emergency Repair - 24/7 Push',
      'Summer AC Tune-Up Special',
      'Winter Furnace Inspection Deal',
      'Nextdoor Community Ads',
      'Google My Business Optimization',
      'Storm Damage Response Campaign',
      'New Homeowner Welcome Offer',
      'Gutter Cleaning Fall Push',
      'Holiday Lighting Installation',
      'Yelp Sponsored Listing',
      'Local SEO - Plumbing Services',
      'Senior Discount Awareness',
      'Bundle Deal - HVAC + Plumbing',
      'Review Generation Campaign',
    ],
  },
];

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomDateWithinLastMonths(months: number): Date {
  const now = Date.now();
  const msPerMonth = 30 * 24 * 60 * 60 * 1000;
  const earliest = now - months * msPerMonth;
  return new Date(earliest + Math.random() * (now - earliest));
}

function buildCampaign(clientId: string, name: string) {
  const budget = Math.round(randomBetween(200, 5000) * 100) / 100;

  // Impressions loosely track budget (roughly $ per thousand impressions),
  // but with enough variance that campaigns end up genuinely high- or
  // low-performing rather than following a fixed formula.
  const impressionsPerDollar = randomBetween(15, 40);
  const performanceVariance = randomBetween(0.5, 1.8);
  const impressions = Math.max(50, Math.round(budget * impressionsPerDollar * performanceVariance));

  // Click-through rate between 0.5% and 4%.
  const ctr = randomBetween(0.005, 0.04);
  const clicks = Math.round(impressions * ctr);

  return {
    clientId,
    name,
    budget,
    impressions,
    clicks,
    createdAt: randomDateWithinLastMonths(4),
  };
}

async function seed() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/orderflow';
  await mongoose.connect(mongoUri);
  console.log(`Connected to ${mongoUri}`);

  const deleteResult = await Campaign.deleteMany({});
  console.log(`Deleted ${deleteResult.deletedCount} existing campaign(s).`);

  const docs = CLIENTS.flatMap((client) =>
    client.names.map((name) => buildCampaign(client.clientId, name)),
  );

  await Campaign.insertMany(docs);
  console.log(`Inserted ${docs.length} campaigns.`);

  const breakdown = await Campaign.aggregate([
    { $group: { _id: '$clientId', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  console.log('\nPer-client breakdown:');
  for (const row of breakdown) {
    console.log(`  ${row._id}: ${row.count}`);
  }

  const total = await Campaign.countDocuments();
  console.log(`\nTotal campaigns: ${total}`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
