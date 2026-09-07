const config = {
  appRoot: ".",
  devices: ["iphone-6.9", "pixel-10-pro"],
  locales: ["en-US"],
  appearance: "dark",
  frame: { variant: "17-pro-silver" },
  theme: {
    background: "linear-gradient(160deg, #070D1E 0%, #0F1B36 50%, #060A14 100%)",
    headlineColor: "#FFFFFF",
    subheadColor: "#F59E0B",
    fontFamily: "Montserrat",
    layout: "classic",
    copyHeightRatio: 0.22,
    deviceWidthRatio: 0.88,
  },
  store: {
    name: "MOMZ'Z Auto Garage",
    subtitle: { "en-US": "Smart Garage & Workshop Management" },
    developer: "MOMZ'Z Tech",
    category: "Business",
    rating: 4.9,
    ratingCount: "2.4K Ratings",
    ageRating: "4+",
    price: "Free",
    description: {
      "en-US": "Complete auto workshop management platform with real-time job cards, service progress tracking, technician leaderboard, vehicle photo studio, and inventory control."
    }
  },
  scenes: [
    {
      kind: "screenshot",
      id: "dashboard",
      flow: "store-01-dashboard",
      headline: { "en-US": "Live Workshop Dashboard" },
      subhead: { "en-US": "Track vehicle job cards, pin priority jobs & monitor status in real-time" }
    },
    {
      kind: "screenshot",
      id: "job-detail",
      flow: "store-02-job-detail",
      headline: { "en-US": "Interactive Service Checklist" },
      subhead: { "en-US": "Assign technicians, distribute points & audit repair milestones" }
    },
    {
      kind: "screenshot",
      id: "photo-studio",
      flow: "store-03-photo-studio",
      headline: { "en-US": "Vehicle Photo Studio" },
      subhead: { "en-US": "Crop, rotate, flip & live-preview vehicle photos for job cards" }
    },
    {
      kind: "screenshot",
      id: "inventory",
      flow: "store-04-inventory",
      headline: { "en-US": "Inventory & Spares Control" },
      subhead: { "en-US": "Real-time stock alerts, pricing & seamless parts billing" }
    },
    {
      kind: "screenshot",
      id: "leaderboard",
      flow: "store-05-leaderboard",
      headline: { "en-US": "Team Leaderboard & Rewards" },
      subhead: { "en-US": "Boost mechanic productivity with points, rankings & trophies" }
    }
  ]
};

export default config;
