export const translations = {
    en: {
        // Sidebar
        dashboard: "Dashboard",
        calendar: "Calendar",
        bookings: "Bookings",
        rooms: "Rooms",
        guests: "Guests",
        finance: "Finance",
        logout: "Sign Out",
        adminDashboard: "Admin Dashboard",

        // Topbar
        searchPlaceholder: "Search bookings, guests, rooms...",

        // Dashboard Stats
        totalCheckIns: "Total Check-ins",
        occupancyRate: "Occupancy Rate",
        totalRevenue: "Total Revenue",
        activeBookings: "Active Bookings",

        // Recent Bookings
        recentBookings: "recent bookings",
        viewAll: "View All",
        status: "Status",
        amount: "Amount",

        // Common
        welcomeBack: "Welcome Back",
        loading: "Loading...",
        // Priority
        priorityCheckIns: "Check-ins",
        prioritySubtitle: "Guests arriving within 24 hours",
        priorityBadge: "Guests",
        today: "Today",
        tomorrow: "Tomorrow",
        pending: "Pending",
        due: "Due",
        paid: "Paid",
        priorityCheckOuts: "Check-outs",
        priorityCheckOutSubtitle: "Guests departing within 24 hours",
    },
    hi: {
        // Sidebar
        dashboard: "डैशबोर्ड",
        calendar: "कैलेंडर",
        bookings: "बुकिंग्स",
        rooms: "कमरे",
        guests: "अतिथि",
        finance: "वित्त",
        logout: "साइन आउट",
        adminDashboard: "एडमिन डैशबोर्ड",

        // Topbar
        searchPlaceholder: "बुकिंग, अतिथि, कमरे खोजें...",

        // Dashboard Stats
        totalCheckIns: "कुल चेक-इन",
        occupancyRate: "उपस्थिति दर",
        totalRevenue: "कुल राजस्व",
        activeBookings: "सक्रिय बुकिंग",

        // Recent Bookings
        recentBookings: "हाल की बुकिंग",
        viewAll: "सभी देखें",
        status: "स्थिति",
        amount: "राशि",

        // Common
        welcomeBack: "वापसी पर स्वागत है",
        loading: "लोड हो रहा है...",

        // Priority
        priorityCheckIns: "चेक-इन्स",
        prioritySubtitle: "24 घंटे में आने वाले अतिथि",
        priorityBadge: "अतिथि",
        today: "आज",
        tomorrow: "कल",
        pending: "लंबित",
        due: "बकाया",
        paid: "भुगतान",
        priorityCheckOuts: "चेक-आउट",
        priorityCheckOutSubtitle: "24 घंटे में जाने वाले अतिथि",
    }
};

export type Language = 'en' | 'hi';
export type TranslationKey = keyof typeof translations.en;
