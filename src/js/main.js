// =================================
// MAIN WEBSITE JAVASCRIPT
// =================================

// Navigation functionality
import "./navigation.js";

// Portfolio gallery functionality
import "./gallery.js";

// Supabase connection
import { supabase } from "../supabase/supabase.js";

// Application status
console.log("Supabase connected:", !!supabase);
console.log("Creative Portfolio Loaded Successfully!");
