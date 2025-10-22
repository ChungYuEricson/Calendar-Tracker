import { Account, Client, Databases } from 'react-native-appwrite';

const client = new Client()
.setEndpoint(process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT!)
.setProject(process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID!)
.setPlatform(process.env.EXPO_PUBLIC_APPWRITE_PLATFORM!);

export const account = new Account(client);
export const databases = new Databases(client); 

export const DATABASE_ID = process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID!;
export const CALENDAR_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_CALENDAR_ID!;
export const EVENT_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_EVENT_ID!;

export const STAMP_COLLECTION_ID = process.env.EXPO_PUBLIC_APPWRITE_COLLECTION_STAMP_ID!;