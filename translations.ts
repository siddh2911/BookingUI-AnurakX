export const translations = {
    en: {
        
        dashboard: "Dashboard",
        calendar: "Calendar",
        bookings: "Bookings",
        rooms: "Rooms",
        guests: "Guests",
        dining: "Dining",
        finance: "Finance",
        marketing: "Marketing",
        channels: "Channels",
        logout: "Sign Out",
        adminDashboard: "Admin Dashboard",

        
        searchPlaceholder: "Search bookings, guests, rooms...",

        
        totalCheckIns: "Total Check-ins",
        occupancyRate: "Occupancy Rate",
        totalRevenue: "Total Revenue",
        activeBookings: "Active Bookings",

        
        recentBookings: "recent bookings",
        viewAll: "View All",
        status: "Status",
        amount: "Amount",

        
        welcomeBack: "Welcome Back",
        loading: "Loading...",
        
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
        
        dashboard: "डैशबोर्ड",
        calendar: "कैलेंडर",
        bookings: "बुकिंग्स",
        rooms: "कमरे",
        guests: "अतिथि",
        dining: "भोजन",
        finance: "वित्त",
        logout: "साइन आउट",
        adminDashboard: "एडमिन डैशबोर्ड",

        
        searchPlaceholder: "बुकिंग, अतिथि, कमरे खोजें...",

        
        totalCheckIns: "कुल चेक-इन",
        occupancyRate: "उपस्थिति दर",
        totalRevenue: "कुल राजस्व",
        activeBookings: "सक्रिय बुकिंग",

        
        recentBookings: "हाल की बुकिंग",
        viewAll: "सभी देखें",
        status: "स्थिति",
        amount: "राशि",

        
        welcomeBack: "वापसी पर स्वागत है",
        loading: "लोड हो रहा है...",

        
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
