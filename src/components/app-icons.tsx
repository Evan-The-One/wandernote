import type { SVGProps } from "react";

export type AppIconName = "depart" | "trips" | "account" | "pin" | "calendar" | "sparkles" | "route" | "poster" | "points" | "support" | "share" | "edit" | "reset" | "chevron";

export function AppIcon({name,className="h-5 w-5",...props}:{name:AppIconName;className?:string}&SVGProps<SVGSVGElement>){
  const paths:Record<AppIconName,React.ReactNode>={
    depart:<><path d="M4 17.5c4-1 5.8-5.4 8.7-8.1 2.1-2 4.2-2.5 7.3-2.9"/><path d="m16.8 3.8 3.4 2.7-2.8 3.3"/><circle cx="5" cy="18" r="1.7"/></>,
    trips:<><rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M8 3.5v4M16 3.5v4M4 10h16M8 14h3M14 14h2"/></>,
    account:<><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20c.6-4 2.8-6 6.5-6s5.9 2 6.5 6"/></>,
    pin:<><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2.3"/></>,
    calendar:<><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/></>,
    sparkles:<><path d="m12 3 1.3 4.2L17.5 9l-4.2 1.7L12 15l-1.4-4.3L6.5 9l4.1-1.8L12 3ZM19 15l.6 2 1.9.8-1.9.8-.6 2-.7-2-1.8-.8 1.8-.8.7-2ZM5 13l.8 2.3 2.2.9-2.2.9L5 19.5l-.8-2.4-2.2-.9 2.2-.9L5 13Z"/></>,
    route:<><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><path d="M7 18c5 0 2-7 7-7h1c2 0 2-3 2-3"/></>,
    poster:<><rect x="4" y="3" width="16" height="18" rx="3"/><circle cx="15.5" cy="8" r="1.5"/><path d="m7 17 3.5-4 2.5 2 2-2 2 4H7Z"/></>,
    points:<><circle cx="12" cy="12" r="8"/><path d="M9 10.2c0-1.2 1.1-2.1 3-2.1s3 .8 3 2c0 3-6 1.3-6 4 0 1.2 1.1 2.1 3 2.1s3-.8 3-2M12 6.5v11"/></>,
    support:<><path d="M5 15v-4a7 7 0 0 1 14 0v4"/><path d="M5 12H3.5A1.5 1.5 0 0 0 2 13.5v2A1.5 1.5 0 0 0 3.5 17H5v-5ZM19 12h1.5a1.5 1.5 0 0 1 1.5 1.5v2a1.5 1.5 0 0 1-1.5 1.5H19v-5ZM19 17c0 2-1.5 3-4 3"/></>,
    share:<><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="m8 11 8-5M8 13l8 5"/></>,
    edit:<><path d="m14 5 5 5M4 20l1.2-5L16 4.2a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8L9 18.8 4 20Z"/></>,
    reset:<><path d="M5.5 8.5A7.5 7.5 0 1 1 4.8 15"/><path d="M5.5 4v4.5H10"/></>,
    chevron:<path d="m9 6 6 6-6 6"/>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>{paths[name]}</svg>;
}
