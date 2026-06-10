# Salesforce Design Patterns to Implement

## Key UI Elements from Research:
1. **Top Navigation Bar** - Horizontal tabs (Home, Chatter, Groups, Files, Leads, Contacts, Opportunities, Reports, Dashboards) with active tab highlighted in blue underline
2. **Global Search** - Center-aligned search with "All" dropdown filter
3. **Page Headers** - Object icon (colored) + Object type label + Record name, with action buttons (New, List View, settings gear, refresh)
4. **Pipeline Inspection View** - Summary KPI bar (Total Pipeline, Closed Won, Commit Forecast, Best Case, Open Pipeline, Closed Lost, Moved In, Moved Out) with colored backgrounds
5. **Data Tables** - Sortable columns with chevrons, column headers with sort indicators, inline edit capability, row-level actions
6. **Record Detail Pages** - Two-column layout with "Related" tab (contacts, activities, opportunities) and "Details" tab (field-value pairs in sections)
7. **Activity Timeline** - Chronological with type icons, expandable entries
8. **Color System** - Salesforce blue (#0176D3), white backgrounds, light gray borders, colored object icons
9. **Cards/Components** - White cards with subtle borders, section headers with action buttons
10. **Path/Stage Indicator** - Horizontal stage progress bar at top of opportunity records

## Salesforce-Specific Features:
- Pipeline Inspection with filters (closing this month, my team)
- "Last updated X minutes ago" timestamp
- Close date change tracking (pushed by X days)
- Days in Stage counter
- Next Step field on opportunities
- Forecast categories (Commit, Best Case, Pipeline)
- Activity History vs Open Activities separation
- Related lists with inline actions (New Task, New Event, Log a Call, Email)
