import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { ID, Query } from "react-native-appwrite";
import { account, CALENDAR_COLLECTION_ID, DATABASE_ID, databases, EVENT_COLLECTION_ID, STAMP_COLLECTION_ID } from "./appwrite";

// Types
// $createdAt and $updatedAt fields removed as requested

export type CalendarSummary = {
    $id: string;
    title: string;
    theme: string;
    user_id: string;
};

export type CalendarEvent = {
    $id: string;
    date: string;
    user_id: string;
    cal_id: string; 
    stamp_id: string;
};

export type EventStamp = { 
    $id: string; 
    name: string;
    event_emoji: string;
    user_id: string;
};

// NEW: Type that combines an event with its stamp data
export type RichCalendarEvent = CalendarEvent & {
    stamp: EventStamp;
};


export type CalendarDetails = CalendarSummary & {
    events: CalendarEvent[];
};

// Context Type definition
type CalendarContextType = {
    calendars: CalendarSummary[];
    selectedCalendar: CalendarDetails | null;
    eventStamps: EventStamp[]; 
    fetchCalendars: () => Promise<void>;
    fetchStamps: () => Promise<void>;
    fetchCalendarById: (id: string) => Promise<void>;
    addCalendar: (title: string, theme: string) => Promise<void>;
    addEvent: (calendarId: string, stampId: string, eventDate: string) => Promise<void>; 
    addStamp: (name: string, icon: string) => Promise<void>;
    // NEW: Functions for detailed event/stamp handling
    fetchEventById: (id: string) => Promise<RichCalendarEvent | null>;
    getStampById: (id: string) => EventStamp | undefined;
};

export const CalendarContext = createContext<CalendarContextType | undefined>(undefined);


export function CalendarProvider({ children }: { children: ReactNode }) {
    const [calendars, setCalendars] = useState<CalendarSummary[]>([]);
    const [selectedCalendar, setSelectedCalendar] = useState<CalendarDetails | null>(null);
    const [eventStamps, setEventStamps] = useState<EventStamp[]>([]);

    async function getCurrentUserId(): Promise<string> {
        try {
            const user = await account.get();
            return user.$id;
        } catch (err) {
            console.log("Error getting current user:", err);
            return ""; 
        }
    }
    
    // NEW: Synchronous utility to find a stamp in the local state
    const getStampById = useCallback((id: string): EventStamp | undefined => {
        return eventStamps.find(stamp => stamp.$id === id);
    }, [eventStamps]);

    // fetchCalendars (Wrapped in useCallback)
    const fetchCalendars = useCallback(async () => {
        try {
            const userId = await getCurrentUserId();
            
            const response = await databases.listDocuments(DATABASE_ID, CALENDAR_COLLECTION_ID, [
                Query.equal("user_id", userId)
            ]);

            const allCalendars: CalendarSummary[] = response.documents.map((doc: any) => ({
                $id: doc.$id,
                title: doc.title,
                theme: doc.theme,
                user_id: doc.user_id, 
            }));

            setCalendars(allCalendars);
        } catch (error) {
            console.log("Error fetching calendars:", error);
        }
    }, []);

    // fetchStamps (Wrapped in useCallback)
    const fetchStamps = useCallback(async () => {
        try {
            const userId = await getCurrentUserId();
            if (!userId) return;

            const response = await databases.listDocuments(DATABASE_ID, STAMP_COLLECTION_ID, [
                Query.equal("user_id", userId)
            ]);

            const stamps: EventStamp[] = response.documents.map((doc: any) => ({
                $id: doc.$id,
                name: doc.name, 
                event_emoji: doc.event_emoji, 
                user_id: doc.user_id,
            }));

            setEventStamps(stamps);
        } catch (error) {
            console.log("Error fetching stamps:", error);
        }
    }, []);

    // NEW: Function to fetch a single event and its related stamp
    const fetchEventById = useCallback(async (id: string): Promise<RichCalendarEvent | null> => {
        try {
            const eventDoc: any = await databases.getDocument(DATABASE_ID, EVENT_COLLECTION_ID, id);

            const event: CalendarEvent = {
                $id: eventDoc.$id,
                date: eventDoc.date,
                user_id: eventDoc.user_id,
                cal_id: eventDoc.cal_id,
                stamp_id: eventDoc.stamp_id,
            };

            // Attempt to find the stamp in the locally stored stamps first using the new utility
            let stamp = getStampById(event.stamp_id);

            // Optional: If the stamp isn't loaded (e.g., event was created by another user 
            // and this user hasn't fetched all stamps, or permissions issue), fetch it directly.
            if (!stamp) {
                 const stampDoc: any = await databases.getDocument(DATABASE_ID, STAMP_COLLECTION_ID, event.stamp_id);
                 stamp = {
                     $id: stampDoc.$id,
                     name: stampDoc.name,
                     event_emoji: stampDoc.event_emoji,
                     user_id: stampDoc.user_id,
                 } as EventStamp;
            }

            return { ...event, stamp: stamp as EventStamp };
        } catch (error) {
            console.log(`Error fetching event ${id}:`, error);
            return null;
        }
    }, [getStampById]); 


    // addStamp (Wrapped in useCallback)
    const addStamp = useCallback(async (name: string, icon: string) => {
        try {
            const userId = await getCurrentUserId();

            const doc: any = await databases.createDocument(
                DATABASE_ID,
                STAMP_COLLECTION_ID,
                ID.unique(),
                {
                    name: name,
                    event_emoji: icon,
                    user_id: userId,
                }
            );

            const newStamp: EventStamp = { 
                $id: doc.$id, 
                name: doc.name, 
                event_emoji: doc.event_emoji, 
                user_id: doc.user_id,
            };
            setEventStamps(prev => [...prev, newStamp]);
        } catch (error) {
            console.log("Error adding stamp:", error);
        }
    }, []); 

    // fetchCalendarById (Mapping updated)
    const fetchCalendarById = useCallback(async (id: string) => {
        try {
            const calendarDoc: any = await databases.getDocument(DATABASE_ID, CALENDAR_COLLECTION_ID, id);

            const eventsResponse = await databases.listDocuments(DATABASE_ID, EVENT_COLLECTION_ID, [
                Query.equal("cal_id", id), 
            ]);
            
            const events: CalendarEvent[] = eventsResponse.documents.map((doc: any) => ({
                $id: doc.$id,
                date: doc.date,
                user_id: doc.user_id,
                cal_id: doc.cal_id,
                stamp_id: doc.stamp_id, 
            }));
            
            // 🚀 DEBUG LOG 1: Print raw event data to console (Already done)
            console.log("--- FETCHED EVENTS DEBUG ---");
            console.log(`Calendar ID: ${id}`);
            console.log("Events:", events);
            
            // 🚀 DEBUG LOG 2: Check stamp lookup for each event
            events.forEach(event => {
                const stamp = getStampById(event.stamp_id);
                console.log(`Event ID ${event.$id.substring(0, 8)}... (Stamp ID: ${event.stamp_id.substring(0, 8)}...): Found Emoji -> ${stamp?.event_emoji || 'NOT FOUND'}`);
            });
            console.log("----------------------------");


            setSelectedCalendar({
                $id: calendarDoc.$id,
                title: calendarDoc.title,
                theme: calendarDoc.theme,
                user_id: calendarDoc.user_id ?? "",
                events: events, 
            } as CalendarDetails);
        } catch (error) {
            console.log("Error fetching calendar and events:", error);
        }
    }, [getStampById]); // Added getStampById to dependency array for completeness

    // addCalendar (Wrapped in useCallback)
    const addCalendar = useCallback(async (title: string, theme: string) => {
        try {
            const userId = await getCurrentUserId();
            const doc: any = await databases.createDocument(
                DATABASE_ID,
                CALENDAR_COLLECTION_ID,
                ID.unique(),
                { title, theme, user_id: userId, }
            );

            setCalendars(prev => [
                ...prev,
                {
                    $id: doc.$id,
                    title: doc.title,
                    theme: doc.theme,
                    user_id: doc.user_id ?? userId,
                },
            ]);
        } catch (error) {
            console.log("Error adding calendar:", error);
        }
    }, []);

    // addEvent (Wrapped in useCallback, includes force-update fix)
    const addEvent = useCallback(async (calendarId: string, stampId: string, eventDate: string) => { 
        try {
            const userId = await getCurrentUserId();
            
            const newEventDoc: any = await databases.createDocument(
                DATABASE_ID,
                EVENT_COLLECTION_ID, 
                ID.unique(),
                {
                    date: eventDate,
                    user_id: userId, 
                    cal_id: calendarId, 
                    stamp_id: stampId,
                }
            );

            const createdEvent: CalendarEvent = {
                $id: newEventDoc.$id,
                date: newEventDoc.date,
                user_id: newEventDoc.user_id,
                cal_id: newEventDoc.cal_id,
                stamp_id: newEventDoc.stamp_id,
            };

            // 🛑 FIX: Use spread operator on the prev object to force a new object reference.
            setSelectedCalendar(prev => {
                if (!prev || prev.$id !== calendarId) return prev;
                
                // 1. Create a new events array
                const newEventsArray = [...prev.events, createdEvent];

                // 2. Return a brand new object using spread syntax
                return { 
                    ...prev, 
                    events: newEventsArray,
                };
            });
            
        } catch (error) {
            console.log("Error adding event:", error);
        }
    }, []); 

    
    useEffect(() => {
        fetchStamps();
    }, [fetchStamps]);

    return (
        <CalendarContext.Provider
            value={{ 
                calendars, 
                selectedCalendar, 
                eventStamps, 
                fetchCalendars, 
                fetchStamps,
                fetchCalendarById, 
                addCalendar, 
                addEvent,
                addStamp,
                fetchEventById, // ADDED
                getStampById, // ADDED
            }}
        >
            {children}
        </CalendarContext.Provider>
    );
}


export function useCalendar() {
    const context = useContext(CalendarContext);
    if (!context) throw new Error("useCalendar must be used within a CalendarProvider");
    return context;
}
