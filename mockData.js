const mockAppsData = {
  fitpulse: {
    id: "fitpulse",
    name: "FitPulse AI",
    tagline: "AI Fitness & Workout Coach",
    category: "Health & Fitness",
    categoryRank: "#12 in Health & Fitness",
    rating: 4.8,
    downloads: 124500,
    activeUsers: 42300,
    subscribers: 8900,
    mrr: 44500,
    socialGrowth: "+24% MoM",
    conversionRate: "4.2%",
    logoColor: "linear-gradient(135deg, #FF6B6B, #FF8E53)",
    keywords: [
      { keyword: "ai workout planner", volume: 85, competition: "High", rank: 4 },
      { keyword: "fitness coach ai", volume: 72, competition: "Medium", rank: 2 },
      { keyword: "custom exercise routine", volume: 90, competition: "High", rank: 12 },
      { keyword: "personal trainer app", volume: 98, competition: "Very High", rank: 18 },
      { keyword: "smart gym log", volume: 45, competition: "Low", rank: 1 },
      { keyword: "calorie counter", volume: 99, competition: "Very High", rank: 34 }
    ],
    competitors: [
      { name: "MyFitnessPal", downloads: 2200000, rating: 4.7, rank: 1, keyword: "calorie tracker" },
      { name: "Fitbod", downloads: 450000, rating: 4.6, rank: 3, keyword: "workout generator" },
      { name: "Freeletics", downloads: 680000, rating: 4.5, rank: 2, keyword: "hiit workouts" }
    ],
    reviews: [
      {
        id: "fp_r1",
        author: "Sarah Jenkins",
        rating: 5,
        sentiment: "positive",
        platform: "ios",
        date: "2026-06-05",
        country: "US",
        text: "The AI workout suggestions are spot on! It adjusted perfectly to my minor knee injury and planned an awesome upper body and core split. Definitely worth the subscription!"
      },
      {
        id: "fp_r2",
        author: "Marcus Chen",
        rating: 4,
        sentiment: "positive",
        platform: "android",
        date: "2026-06-03",
        country: "CA",
        text: "Solid fitness planner. The smart gym log feature tracks everything nicely. I just wish there was a web version so I could review my statistics on a larger screen."
      },
      {
        id: "fp_r3",
        author: "Elena Rostova",
        rating: 2,
        sentiment: "negative",
        platform: "ios",
        date: "2026-06-01",
        country: "UK",
        text: "The voice coach gets extremely repetitive during runs. Please add more voice styles or at least a mode to turn off everything except milestone notifications."
      },
      {
        id: "fp_r4",
        author: "David K.",
        rating: 5,
        sentiment: "positive",
        platform: "ios",
        date: "2026-05-28",
        country: "AU",
        text: "Saved me hundreds on a personal trainer. The exercises are clearly explained and the video guides are highly premium. Highly recommended!"
      },
      {
        id: "fp_r5",
        author: "Jean-Pierre",
        rating: 3,
        sentiment: "neutral",
        platform: "android",
        date: "2026-05-25",
        country: "FR",
        text: "Good interface but integration with Google Fit is buggy. Sometimes syncs duplicate workouts, which ruins the weekly streaks dashboard."
      }
    ],
    roadmap: [
      { id: "fp_road1", title: "Apple Watch Live Tracker", desc: "View real-time heart rate zones and rep counts directly on your watch screen.", category: "Feature", votes: 412, status: "in-progress", visibility: "public" },
      { id: "fp_road2", title: "Social Workout Challenges", desc: "Create workout groups and invite friends to compete in weekly active-calorie challenges.", category: "Feature", votes: 289, status: "planned", visibility: "public" },
      { id: "fp_road3", title: "Android WearOS App Sync", desc: "Bring fully standalone exercise tracking to WearOS smartwatch models.", category: "Feature", votes: 156, status: "planned", visibility: "public" },
      { id: "fp_road4", title: "Premium Nutrition Database", desc: "Barcode scanner and local food verification for highly accurate calorie logs.", category: "Feature", votes: 310, status: "completed", visibility: "public" },
      { id: "fp_road5", title: "Custom Exercise Video Uploads", desc: "Allow personal trainers to upload custom routine instructions for their clients.", category: "B2B Expansion", votes: 98, status: "planned", visibility: "private" }
    ],
    analytics: {
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      downloads: [8500, 12000, 19500, 24000, 29000, 31500],
      mrr: [8500, 12500, 20100, 28000, 37500, 44500],
      activeUsers: [10000, 15000, 23000, 31000, 39000, 42300],
      roi: [120, 155, 180, 210, 245, 260]
    },
    copilotInsights: [
      { title: "ASO Opportunity", text: "Rankings for 'smart gym log' increased from #3 to #1 this week. Shift 15% of meta tags keywords to capture related high-traffic search terms.", type: "aso" },
      { title: "Target Audience Expansion", text: "Competitor 'Freeletics' launched an office fitness campaign. We suggest building a 'SaaS integration' or 'Desk Workout' collection.", type: "audience" },
      { title: "Growth Bottleneck", text: "App review sentiments point to Google Fit synchronization bugs. Fixing this could improve Android app ratings and boost conversion rates by 0.6%.", type: "fix" }
    ],
    crossPromoOptions: [
      { targetApp: "taskflow", angle: "Healthy Habits for Busy Professionals: Track workout goals right inside your daily TaskFlow workspace dashboard." },
      { targetApp: "saasify", angle: "Data-Driven Wellness: Track how your stress levels and workout streaks correlate with work productivity trends." }
    ]
  },
  taskflow: {
    id: "taskflow",
    name: "TaskFlow SaaS",
    tagline: "Collaborative Task Management Suite",
    category: "Productivity",
    categoryRank: "#34 in Productivity",
    rating: 4.6,
    downloads: 98200,
    activeUsers: 34100,
    subscribers: 4200,
    mrr: 63000,
    socialGrowth: "+18% MoM",
    conversionRate: "5.1%",
    logoColor: "linear-gradient(135deg, #4F46E5, #3B82F6)",
    keywords: [
      { keyword: "saas task manager", volume: 78, competition: "High", rank: 3 },
      { keyword: "kanban board team", volume: 82, competition: "Very High", rank: 11 },
      { keyword: "gantt chart planner", volume: 64, competition: "Medium", rank: 5 },
      { keyword: "agile sprint software", volume: 75, competition: "High", rank: 15 },
      { keyword: "remote work productivity", volume: 88, competition: "High", rank: 9 },
      { keyword: "simple task list app", volume: 95, competition: "Very High", rank: 25 }
    ],
    competitors: [
      { name: "Trello", downloads: 8500000, rating: 4.7, rank: 1, keyword: "visual boards" },
      { name: "Monday.com", downloads: 3400000, rating: 4.8, rank: 2, keyword: "work os" },
      { name: "Todoist", downloads: 4100000, rating: 4.6, rank: 3, keyword: "personal checklist" }
    ],
    reviews: [
      {
        id: "tf_r1",
        author: "Bradley Vance",
        rating: 5,
        sentiment: "positive",
        platform: "ios",
        date: "2026-06-06",
        country: "US",
        text: "Clean, fast, and does exactly what we need. The keyboard shortcuts are incredibly well thought out, making rapid task entries effortless."
      },
      {
        id: "tf_r2",
        author: "Chloe Dubois",
        rating: 5,
        sentiment: "positive",
        platform: "ios",
        date: "2026-06-04",
        country: "FR",
        text: "Outstanding team view. Transitioning our dev agency from Jira to TaskFlow was the best decision of our quarter. The UI feels modern and responsive."
      },
      {
        id: "tf_r3",
        author: "Rajiv M.",
        rating: 3,
        sentiment: "neutral",
        platform: "android",
        date: "2026-05-30",
        country: "IN",
        text: "I enjoy the desktop client, but the Android app is quite sluggish when loading large project boards with hundreds of active tasks. Needs performance updates."
      },
      {
        id: "tf_r4",
        author: "Samantha Bell",
        rating: 2,
        sentiment: "negative",
        platform: "ios",
        date: "2026-05-24",
        country: "NZ",
        text: "They changed the dark theme to a high-contrast blue, and it's giving me eye strain. Please give us back the classic slate gray theme or make themes customizable."
      }
    ],
    roadmap: [
      { id: "tf_road1", title: "AI Subtask Auto-Generator", desc: "Break down large task descriptions into granular subtasks using a localized AI generator.", category: "AI Integration", votes: 620, status: "in-progress", visibility: "public" },
      { id: "tf_road2", title: "Figma Embed Integrations", desc: "Preview live designs and interactive prototypes directly inside your board cards.", category: "Integrations", votes: 412, status: "planned", visibility: "public" },
      { id: "tf_road3", title: "Time Tracking & Timesheets", desc: "Log and export hours spent on tasks to generate automated invoices for clients.", category: "Feature", votes: 345, status: "completed", visibility: "public" },
      { id: "tf_road4", title: "Offline Sync Mode", desc: "Work seamlessly inside tunnel rides or flights and let tasks auto-sync once online.", category: "Core App", votes: 298, status: "planned", visibility: "public" }
    ],
    analytics: {
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      downloads: [5200, 7800, 11200, 14800, 16900, 18200],
      mrr: [19000, 27500, 39000, 48000, 56000, 63000],
      activeUsers: [12000, 18000, 24000, 28500, 31500, 34100],
      roi: [140, 160, 195, 230, 220, 250]
    },
    copilotInsights: [
      { title: "Conversion Optimization", text: "A high volume of signups drops off at the 'Invite Team Members' onboarding step. Offer a 10% discount to users completing team setups.", type: "conversion" },
      { title: "Feature Opportunity", text: "Customer requests for an 'AI Auto-Scheduler' are up by 40%. Highlight this feature in the upcoming version v3.1 update campaign.", type: "feature" },
      { title: "Competitor Intelligence", text: "Monday.com announced price updates for their basic tier. Running a 'Migration Offer' social campaign could target their price-sensitive cohorts.", type: "competitor" }
    ],
    crossPromoOptions: [
      { targetApp: "fitpulse", angle: "Optimize Work-Life Balance: Embed FitPulse recovery breaks right into your TaskFlow work sprints." },
      { targetApp: "saasify", angle: "Track Product Launch Pipelines: Track SaaSify metrics linked directly to task board milestones." }
    ]
  },
  saasify: {
    id: "saasify",
    name: "SaaSify Analytics",
    tagline: "Startup Metrics & Financial Analytics",
    category: "Developer Tools",
    categoryRank: "#47 in Developer Tools",
    rating: 4.7,
    downloads: 32000,
    activeUsers: 14500,
    subscribers: 1540,
    mrr: 77000,
    socialGrowth: "+31% MoM",
    conversionRate: "7.8%",
    logoColor: "linear-gradient(135deg, #10B981, #059669)",
    keywords: [
      { keyword: "startup dashboard metrics", volume: 60, competition: "Medium", rank: 2 },
      { keyword: "saas churn tracker", volume: 55, competition: "Low", rank: 1 },
      { keyword: "stripe data analytics", volume: 72, competition: "High", rank: 6 },
      { keyword: "revenue metrics forecaster", volume: 48, competition: "Medium", rank: 8 },
      { keyword: "mrr calculator live", volume: 50, competition: "Low", rank: 3 }
    ],
    competitors: [
      { name: "Baremetrics", downloads: 85000, rating: 4.6, rank: 2, keyword: "stripe charts" },
      { name: "ChartMogul", downloads: 140000, rating: 4.8, rank: 1, keyword: "saas analytics" },
      { name: "ProfitWell", downloads: 210000, rating: 4.7, rank: 3, keyword: "churn reduction" }
    ],
    reviews: [
      {
        id: "sf_r1",
        author: "Elena Rostova",
        rating: 5,
        sentiment: "positive",
        platform: "ios",
        date: "2026-06-07",
        country: "UK",
        text: "We plug in our Stripe API and within minutes have a clean view of our LTV, MRR, and churn metrics. Outstanding UX, super clean charts!"
      },
      {
        id: "sf_r2",
        author: "Julian Vance",
        rating: 4,
        sentiment: "positive",
        platform: "ios",
        date: "2026-06-02",
        country: "US",
        text: "The cohort analysis tool is wonderful. However, exporting data to CSV is slow when pulling multiple years of history. Still, it is the best metrics tool."
      },
      {
        id: "sf_r3",
        author: "Liam Garcia",
        rating: 2,
        sentiment: "negative",
        platform: "android",
        date: "2026-05-18",
        country: "ES",
        text: "Subscription billing features are hard to customize. The alerts for cancellations are either on or off, with no fine-grained notifications settings."
      }
    ],
    roadmap: [
      { id: "sf_road1", title: "Paddle Integration Hub", desc: "Import and merge Paddle payment logs alongside Stripe data automatically.", category: "Integrations", votes: 480, status: "in-progress", visibility: "public" },
      { id: "sf_road2", title: "Predictive Churn forecaster", desc: "Machine learning algorithms that flag high-risk customers based on app engagement metrics.", category: "AI Analytics", votes: 395, status: "planned", visibility: "public" },
      { id: "sf_road3", title: "Custom Dashboard Designer", desc: "Drag-and-drop tiles to create unique KPI boards for team viewing.", category: "Core App", votes: 212, status: "planned", visibility: "public" },
      { id: "sf_road4", title: "Multi-Currency Automated Convertor", desc: "Sync conversions based on daily exchange rates to calculate global cash flows.", category: "Feature", votes: 190, status: "completed", visibility: "private" }
    ],
    analytics: {
      months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
      downloads: [1800, 2400, 3100, 3900, 4500, 5200],
      mrr: [25000, 36000, 49000, 59000, 68000, 77000],
      activeUsers: [4000, 6500, 8900, 11000, 13100, 14500],
      roi: [180, 210, 240, 260, 280, 315]
    },
    copilotInsights: [
      { title: "High-Yield Acquisition", text: "Blog traffic on 'reducing SaaS churn' is converting at 12%. Direct 30% of content marketing budget to write guides on customer retention.", type: "marketing" },
      { title: "Ecosystem Opportunity", text: "Leverage TaskFlow users to create a project tracking workflow. We recommend launching a unified bundle offering.", type: "crosspromo" },
      { title: "ASO Performance", text: "Rankings for 'stripe data analytics' grew from page 2 to top 6. Keep active keyword optimizations to enter top 3.", type: "aso" }
    ],
    crossPromoOptions: [
      { targetApp: "fitpulse", angle: "Healthy Founders: Track your metrics and schedule mental health workout breaks when MRR milestones are met." },
      { targetApp: "taskflow", angle: "Sync Task Delivery with Financial Growth: Map your development speed to real-time subscription revenue spikes." }
    ]
  }
};

// ==========================================
// PHASE 2 EXTRA INFRASTRUCTURE DATA
// ==========================================

const mockAuthData = {
  currentUser: {
    email: "founder@growthsuite.co",
    name: "Shadi",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80",
    orgName: "CyberVentures Ltd",
    currentRole: "Owner",
    workspaceId: "ws_default"
  },
  organizations: [
    { id: "org_1", name: "CyberVentures Ltd", plan: "Enterprise Premium" }
  ],
  workspaces: [
    { id: "ws_1", name: "CyberVentures Main", orgId: "org_1" },
    { id: "ws_2", name: "Global R&D Sandbox", orgId: "org_1" }
  ],
  teamMembers: [
    { id: "mem_1", name: "Shadi (You)", email: "founder@growthsuite.co", role: "Owner", status: "Active" },
    { id: "mem_2", name: "Elena Rostova", email: "elena@cyberventures.io", role: "Admin", status: "Active" },
    { id: "mem_3", name: "Sarah Jenkins", email: "sarah@fitpulse.ai", role: "Editor", status: "Active" },
    { id: "mem_4", name: "Marcus Chen", email: "marcus@taskflow.dev", role: "Viewer", status: "Active" }
  ],
  socialAccounts: [
    { platform: "facebook", name: "FitPulse Fitness", handle: "@fitpulse_fit", status: "Connected", expires: "2026-09-08" },
    { platform: "instagram", name: "FitPulse Official", handle: "@fitpulse.ai", status: "Connected", expires: "2026-09-08" },
    { platform: "threads", name: "FitPulse Threads", handle: "@fitpulse", status: "Connected", expires: "2026-09-08" },
    { platform: "linkedin", name: "CyberVentures SaaS", handle: "/company/cyberventures", status: "Connected", expires: "2026-11-20" },
    { platform: "twitter", name: "GrowthSuite Dev", handle: "@growthsuite_co", status: "Connected", expires: "2026-08-15" },
    { platform: "youtube", name: "TaskFlow Tutorials", handle: "TaskFlow Channel", status: "Connected", expires: "2026-12-01" },
    { platform: "tiktok", name: "FitPulse HIIT", handle: "@fitpulse_tiktok", status: "Disconnected", expires: "Expired" },
    { platform: "pinterest", name: "TaskFlow Design Board", handle: "@taskflow_pins", status: "Disconnected", expires: "Expired" }
  ]
};

const mockInboxData = {
  fitpulse: [
    { id: "msg_fp_1", sender: "Bradley Vance", platform: "instagram", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80", text: "Is there any calendar syncing option for workout bookings?", date: "2026-06-08 09:12", read: false, resolved: false },
    { id: "msg_fp_2", sender: "Chloe Dubois", platform: "facebook", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80", text: "I shared your fitness challenge link, is there an affiliate program?", date: "2026-06-07 18:34", read: true, resolved: false },
    { id: "msg_fp_3", sender: "Elena Rostova", platform: "twitter", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80", text: "@FitPulse Your Apple Watch app is phenomenal! Saved my workouts this week.", date: "2026-06-07 14:02", read: true, resolved: true }
  ],
  taskflow: [
    { id: "msg_tf_1", sender: "Marcus Chen", platform: "linkedin", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80", text: "Will you launch desktop widget plugins for the Windows taskbar?", date: "2026-06-08 10:45", read: false, resolved: false },
    { id: "msg_tf_2", sender: "Alice Walker", platform: "twitter", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80", text: "@taskflow My team migrated from Trello today. Board shortcuts are sleek!", date: "2026-06-07 16:30", read: true, resolved: false }
  ],
  saasify: [
    { id: "msg_sf_1", sender: "Sarah Jenkins", platform: "twitter", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80", text: "@saasify App Store reports show Stripe data webhook connection failures.", date: "2026-06-08 08:00", read: false, resolved: false }
  ]
};

const mockMediaData = {
  folders: ["Brand Assets", "Promotions", "Launch Materials", "Screenshots"],
  assets: [
    { id: "as_1", name: "fitpulse_logo_gradient.png", type: "image/png", size: "2.4 MB", folder: "Brand Assets", tag: "Logo", path: "fitpulse_logo.png", description: "Vibrant red-orange fitness coach brand icon" },
    { id: "as_2", name: "launch_promo_shorts.mp4", type: "video/mp4", size: "14.8 MB", folder: "Promotions", tag: "Video", path: "promo.mp4", description: "Mobile layout highlight sequence showing fitness log routines" },
    { id: "as_3", name: "stripe_setup_guide.pdf", type: "application/pdf", size: "1.2 MB", folder: "Launch Materials", tag: "Guide", path: "stripe_setup.pdf", description: "Integrations setup documentation manual for dev connections" },
    { id: "as_4", name: "taskflow_dark_theme.jpg", type: "image/jpeg", size: "840 KB", folder: "Screenshots", tag: "Mockup", path: "dark_theme.jpg", description: "Kanban task board layout showing customizable high contrast blue styles" }
  ]
};

const mockCalendarData = {
  fitpulse: [
    { id: "cal_fp_1", date: "2026-06-08", time: "09:00", platform: "twitter", text: "Start your week with an AI-customized HIIT routine. FitPulse tracks your active calories seamlessly. 🚀", status: "scheduled", approval: "Approved" },
    { id: "cal_fp_2", date: "2026-06-10", time: "15:00", platform: "instagram", text: "Healthy body, healthy MRR. Switch to fit routines at work! 💪 #HealthyFounder", status: "draft", approval: "Review" },
    { id: "cal_fp_3", date: "2026-06-06", time: "11:00", platform: "linkedin", text: "Why we built standalone WearOS exercise trackers for active founders.", status: "published", approval: "Approved" }
  ],
  taskflow: [
    { id: "cal_tf_1", date: "2026-06-09", time: "10:00", platform: "linkedin", text: "Productivity is not about working more hours. It's about optimizing workspace shortcuts. 💻", status: "scheduled", approval: "Approved" }
  ],
  saasify: [
    { id: "cal_sf_1", date: "2026-06-08", time: "12:00", platform: "twitter", text: "Calculate churn rates automatically. Connect Stripe webhooks to SaaSify. 📊", status: "scheduled", approval: "Approved" }
  ]
};

const mockDatabaseSchema = {
  users: {
    columns: [
      { name: "id", type: "uuid", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()" },
      { name: "email", type: "varchar(255)", constraint: "UNIQUE NOT NULL" },
      { name: "name", type: "varchar(255)", constraint: "" },
      { name: "avatar_url", type: "text", constraint: "" },
      { name: "created_at", type: "timestamptz", constraint: "DEFAULT now()" }
    ],
    rls: "ALL: Authenticated users can read/write their own user record."
  },
  organizations: {
    columns: [
      { name: "id", type: "uuid", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()" },
      { name: "name", type: "varchar(255)", constraint: "NOT NULL" },
      { name: "plan", type: "varchar(50)", constraint: "DEFAULT 'free'" },
      { name: "stripe_customer_id", type: "varchar(255)", constraint: "UNIQUE" },
      { name: "created_at", type: "timestamptz", constraint: "DEFAULT now()" }
    ],
    rls: "ALL: Members can read org. Owners and Admins can update org."
  },
  members: {
    columns: [
      { name: "id", type: "uuid", constraint: "PRIMARY KEY DEFAULT gen_random_uuid()" },
      { name: "org_id", type: "uuid", constraint: "REFERENCES organizations(id) ON DELETE CASCADE" },
      { name: "user_id", type: "uuid", constraint: "REFERENCES users(id) ON DELETE CASCADE" },
      { name: "role", type: "varchar(50)", constraint: "DEFAULT 'member' CHECK (role IN ('Owner','Admin','Manager','Editor','Viewer'))" },
      { name: "created_at", type: "timestamptz", constraint: "DEFAULT now()" }
    ],
    rls: "READ: Members of same org. WRITE: Owners/Admins only."
  },
  projects: {
    columns: [
      { name: "id", type: "uuid", constraint: "PRIMARY KEY" },
      { name: "org_id", type: "uuid", constraint: "REFERENCES organizations(id)" },
      { name: "name", type: "varchar(255)", constraint: "" },
      { name: "metadata", type: "jsonb", constraint: "" }
    ],
    rls: "ALL: Org members can query projects. Editors/Managers can write."
  },
  social_accounts: {
    columns: [
      { name: "id", type: "uuid", constraint: "PRIMARY KEY" },
      { name: "project_id", type: "uuid", constraint: "REFERENCES projects(id)" },
      { name: "platform", type: "varchar(50)", constraint: "" },
      { name: "access_token", type: "text", constraint: "" },
      { name: "refresh_token", type: "text", constraint: "" },
      { name: "expires_at", type: "timestamptz", constraint: "" }
    ],
    rls: "ALL: Authorized members with matching project scope. Tokens encrypted."
  },
  posts: {
    columns: [
      { name: "id", type: "uuid", constraint: "PRIMARY KEY" },
      { name: "project_id", type: "uuid", constraint: "REFERENCES projects(id)" },
      { name: "platform", type: "varchar(50)", constraint: "" },
      { name: "content", type: "text", constraint: "" },
      { name: "scheduled_at", type: "timestamptz", constraint: "" },
      { name: "status", type: "varchar(50)", constraint: "DEFAULT 'draft'" }
    ],
    rls: "ALL: Org members of matching project. Editors/Managers can execute posts."
  },
  audit_logs: {
    columns: [
      { name: "id", type: "uuid", constraint: "PRIMARY KEY" },
      { name: "user_id", type: "uuid", constraint: "REFERENCES users(id)" },
      { name: "action", type: "varchar(255)", constraint: "" },
      { name: "entity", type: "varchar(100)", constraint: "" },
      { name: "ip_address", type: "varchar(45)", constraint: "" },
      { name: "timestamp", type: "timestamptz", constraint: "DEFAULT now()" }
    ],
    rls: "READ: Owners and Admins only. WRITE: System auto-logs."
  }
};

const mockJobsData = [
  { name: "scheduled_publishing", status: "Active", total: 420, active: 2, failed: 0, delay: "Realtime" },
  { name: "analytics_collection", status: "Active", total: 1240, active: 4, failed: 2, delay: "Hourly" },
  { name: "agent_execution", status: "Active", total: 68, active: 1, failed: 0, delay: "On Demand" },
  { name: "review_imports", status: "Active", total: 512, active: 0, failed: 1, delay: "Twice Daily" },
  { name: "report_generation", status: "Active", total: 45, active: 0, failed: 0, delay: "Weekly" },
  { name: "notification_delivery", status: "Active", total: 4320, active: 0, failed: 0, delay: "Realtime" }
];

const mockNotifications = [
  { id: "notif_1", type: "failed_post", title: "Failed Publishing Attempt", desc: "Pinterest account verification token expired on TaskFlow.", time: "10m ago" },
  { id: "notif_2", type: "review_alert", title: "Low App Rating Alert", desc: "FitPulse iOS app received a 2-star review from UK.", time: "1h ago" },
  { id: "notif_3", type: "agent_completed", title: "Agent Run Competitor Intelligence", desc: "ASO Agent finished comparison analysis for Baremetrics.", time: "3h ago" },
  { id: "notif_4", type: "approval_request", title: "Approval Chain Request", desc: "Sarah Jenkins submitted a promo post draft for review.", time: "4h ago" }
];

const mockDailyBriefings = {
  fitpulse: {
    usersGained: "54 new fitness subscribers",
    engagementRate: "+8.4% Instagram reach",
    competitorMove: "Fitbod launched a desk active break campaign yesterday.",
    appStoreRating: "App Store rating stable at 4.8. Review alerts resolved.",
    actions: [
      "Approve scheduled Countdown campaigns.",
      "Check Google Fit sync errors in reviews feed.",
      "Launch target ASO subtitle update for keyword 'personal trainer app'."
    ]
  },
  taskflow: {
    usersGained: "12 active workspace teams",
    engagementRate: "+12.2% LinkedIn clicks",
    competitorMove: "Monday.com announced basic pricing tier adjustments.",
    appStoreRating: "Android rating dropped slightly to 4.5 due to tablet sync delays.",
    actions: [
      "Review custom subtasks auto-generator roadmap progress.",
      "Reply to Marcus Chen comment in Social Inbox.",
      "Approve time tracking release changelog draft."
    ]
  },
  saasify: {
    usersGained: "3 corporate Stripe metrics hooks",
    engagementRate: "+4.1% Twitter engagement",
    competitorMove: "Baremetrics added a custom cohort analysis wizard.",
    appStoreRating: "Developer Tools rating constant at 4.7.",
    actions: [
      "Fix Stripe webhooks connection alert in notifications.",
      "Regenerate weekly strategic metrics executive report.",
      "Create cross-promotion ad for FitPulse users."
    ]
  }
};

if (typeof module !== "undefined") {
  module.exports = {
    mockAppsData,
    mockAuthData,
    mockInboxData,
    mockMediaData,
    mockCalendarData,
    mockDatabaseSchema,
    mockJobsData,
    mockNotifications,
    mockDailyBriefings
  };
}
