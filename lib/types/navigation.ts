// app/(tabs)/types/navigation.ts

export type RootStackParamList = {
  // Screens that take no parameters use 'undefined'
  Index: undefined; 
  
  // The screen that requires parameters
  CalendarViewScreen: { 
    calendarId: string;
    calendarTitle: string;
    calendarTheme: string;
  };
  
  // Add any other screens here...
  'profile': undefined; 
};