const fs = require('fs');

// 1. Fix AppLayout Mobile Padding (so cards don't touch edges)
const appLayoutPath = 'src/components/AppLayout.tsx';
let appLayoutContent = fs.readFileSync(appLayoutPath, 'utf8');
appLayoutContent = appLayoutContent.replace(
  '<main className="flex-1 p-0 sm:p-4 md:p-5 lg:p-6 xl:p-8 pb-28 md:pb-8',
  '<main className="flex-1 px-3 pt-3 pb-28 sm:p-4 md:p-5 lg:p-6 xl:p-8 md:pb-8'
);
appLayoutContent = appLayoutContent.replace(
  'mobile-edge-grid',
  ''
);
fs.writeFileSync(appLayoutPath, appLayoutContent, 'utf8');
console.log("AppLayout.tsx fixed.");

// 2. Fix AdminDashboard UI (Black border, rounded corners, slowness)
const adminDashboardPath = 'src/components/AdminDashboard.tsx';
let adminContent = fs.readFileSync(adminDashboardPath, 'utf8');

// Fix Table Wrapper (remove black border-y and restore rounded corners and borders)
const tableWrapperRegex = /<div className="bg-white border-y sm:border sm:border-slate-200 sm:rounded-2xl overflow-hidden shadow-sm -mx-3 sm:mx-0">/g;
adminContent = adminContent.replace(
  tableWrapperRegex,
  '<div className="bg-white border border-slate-200/80 rounded-xl sm:rounded-2xl overflow-hidden shadow-sm">'
);

// Fix Pagination Wrapper (remove black border-y and restore rounded corners and borders)
const paginationWrapperRegex = /<div className="flex flex-col sm:flex-row items-center justify-between bg-white border-y sm:border sm:border-slate-200 p-3 sm:p-4 -mx-4 sm:mx-0 sm:rounded-2xl sm:shadow-sm mt-3 text-xs font-bold text-slate-500 gap-4">/g;
adminContent = adminContent.replace(
  paginationWrapperRegex,
  '<div className="flex flex-col sm:flex-row items-center justify-between bg-white border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm mt-3 text-xs font-bold text-slate-500 gap-4">'
);

// Optimize Students Filtering with useMemo to fix "slow" system
// We need to find the `const filtered = students.filter` block and wrap it in useMemo
// First, check if useMemo is imported in AdminDashboard.tsx
if (!adminContent.includes('useMemo')) {
  adminContent = adminContent.replace(
    'import React, { useState, useEffect, useRef } from "react";',
    'import React, { useState, useEffect, useRef, useMemo } from "react";'
  );
  adminContent = adminContent.replace(
    'import { useState, useEffect, useRef } from "react";',
    'import { useState, useEffect, useRef, useMemo } from "react";'
  );
}

// Replace the filter block
const filterBlockTarget = `                    const filtered = students.filter((s: any) => {
                      const q = dirSearch.trim().toLowerCase();
                      const matchesSearch =
                        !q ||
                        s.name?.toLowerCase().includes(q) ||
                        s.admissionNo?.toLowerCase().includes(q) ||
                        (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
                        (s.familyCode && s.familyCode.toLowerCase().includes(q)) ||
                        (s.parentName && s.parentName.toLowerCase().includes(q)) ||
                        (s.fatherMobile && s.fatherMobile.toLowerCase().includes(q)) ||
                        (s.aadhaar && s.aadhaar.includes(q));

                      const matchesClass = !dirClassFilter || s.class === dirClassFilter;
                      const matchesSection = !dirSectionFilter || s.section === dirSectionFilter;
                      const matchesFamily = !dirFamilyFilter || (s.familyCode && s.familyCode.toLowerCase().trim() === dirFamilyFilter.toLowerCase().trim());
                      const matchesStatus = dirStatusFilter === "ALL" || (s.status || "ACTIVE") === dirStatusFilter;

                      const matchesRte =
                        dirRteFilter === "ALL"
                          ? true
                          : dirRteFilter === "RTE"
                          ? !!s.isRte
                          : dirRteFilter === "NON_RTE"
                          ? !s.isRte
                          : dirRteFilter === "TRANSPORT"
                          ? s.transportMode && s.transportMode !== "Self"
                          : true;

                      const matchesCategory = dirCategoryFilter === "ALL" || (s.category || "General") === dirCategoryFilter;

                      let matchesDues = true;
                      if (dirDuesFilter !== "ALL") {
                        const hasDues = unpaidStudentIdsSet.has(s.id);
                        matchesDues = dirDuesFilter === "HAS_DUES" ? hasDues : !hasDues;
                      }

                      return matchesSearch && matchesClass && matchesSection && matchesFamily && matchesStatus && matchesRte && matchesCategory && matchesDues;
                    });`;

const filterBlockReplacement = `                    const filtered = React.useMemo(() => {
                      return students.filter((s: any) => {
                        const q = dirSearch.trim().toLowerCase();
                        const matchesSearch =
                          !q ||
                          s.name?.toLowerCase().includes(q) ||
                          s.admissionNo?.toLowerCase().includes(q) ||
                          (s.rollNumber && s.rollNumber.toLowerCase().includes(q)) ||
                          (s.familyCode && s.familyCode.toLowerCase().includes(q)) ||
                          (s.parentName && s.parentName.toLowerCase().includes(q)) ||
                          (s.fatherMobile && s.fatherMobile.toLowerCase().includes(q)) ||
                          (s.aadhaar && s.aadhaar.includes(q));

                        const matchesClass = !dirClassFilter || s.class === dirClassFilter;
                        const matchesSection = !dirSectionFilter || s.section === dirSectionFilter;
                        const matchesFamily = !dirFamilyFilter || (s.familyCode && s.familyCode.toLowerCase().trim() === dirFamilyFilter.toLowerCase().trim());
                        const matchesStatus = dirStatusFilter === "ALL" || (s.status || "ACTIVE") === dirStatusFilter;

                        const matchesRte =
                          dirRteFilter === "ALL"
                            ? true
                            : dirRteFilter === "RTE"
                            ? !!s.isRte
                            : dirRteFilter === "NON_RTE"
                            ? !s.isRte
                            : dirRteFilter === "TRANSPORT"
                            ? s.transportMode && s.transportMode !== "Self"
                            : true;

                        const matchesCategory = dirCategoryFilter === "ALL" || (s.category || "General") === dirCategoryFilter;

                        let matchesDues = true;
                        if (dirDuesFilter !== "ALL") {
                          const hasDues = unpaidStudentIdsSet.has(s.id);
                          matchesDues = dirDuesFilter === "HAS_DUES" ? hasDues : !hasDues;
                        }

                        return matchesSearch && matchesClass && matchesSection && matchesFamily && matchesStatus && matchesRte && matchesCategory && matchesDues;
                      });
                    }, [students, dirSearch, dirClassFilter, dirSectionFilter, dirFamilyFilter, dirStatusFilter, dirRteFilter, dirCategoryFilter, dirDuesFilter, unpaidStudentIdsSet]);`;

if (adminContent.includes(filterBlockTarget)) {
  adminContent = adminContent.replace(filterBlockTarget, filterBlockReplacement);
  console.log("Memoized filtered students.");
} else {
  console.log("Could not find filtered block exactly.");
}

// Revert mobile items per page back to 10 just to guarantee no DOM slowness on very low end devices.
adminContent = adminContent.replace(
  'const handleResize = () => setItemsPerPage(window.innerWidth < 768 ? 15 : 50);',
  'const handleResize = () => setItemsPerPage(window.innerWidth < 768 ? 10 : 50);'
);

fs.writeFileSync(adminDashboardPath, adminContent, 'utf8');
console.log("AdminDashboard.tsx fixed.");
