// app/CalendarViewScreen.tsx

import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { EventStamp, useCalendar } from '../lib/calendar-context';


// 1. EXPO ROUTER FIX: Define screen options for modal presentation.
export const options = {
    title: 'Calendar View',
    presentation: 'modal' as const, 
    headerShown: true,
};

// --- 2. Custom Day Component to display Emojis ---
interface DayWithStampsProps {
    date: DateData;
    state: string;
    marking?: any;
    onPress: (date: DateData) => void;
    eventsByDate: Record<string, EventStamp[]>;
    calendarTheme: string;
}

const DayWithStamps = ({ date, state, marking, onPress, eventsByDate, calendarTheme }: DayWithStampsProps) => {
    const dayStamps = useMemo(() => {
        const stamps = eventsByDate[date.dateString] || [];
        // Show only unique stamp icons for the day
        const uniqueIcons = new Set(stamps.map(s => s.event_emoji));
        return Array.from(uniqueIcons);
    }, [date.dateString, eventsByDate]);

    const isSelected = marking?.selected;
    const isToday = state === 'today';

    const dayStyle = [
        styles.customDayContainer,
        isSelected && { backgroundColor: 'rgba(0, 0, 0, 0.1)', borderColor: calendarTheme },
        isToday && { borderColor: calendarTheme, borderWidth: 2 },
        state === 'disabled' && { opacity: 0.5 },
    ];

    return (
        <TouchableOpacity
            style={dayStyle}
            onPress={() => onPress(date)}
            disabled={state === 'disabled'}
        >
            <Text style={[styles.customDayText, isSelected && { color: calendarTheme }]}>
                {date.day}
            </Text>
            <View style={styles.customDayMarkers}>
                {dayStamps.map((icon, index) => (
                    <Text key={index} style={styles.emojiMarker}>
                        {icon}
                    </Text>
                ))}
            </View>
        </TouchableOpacity>
    );
};
// ----------------------------------------------------


// 3. MAIN SCREEN COMPONENT
export default function CalendarViewScreen() {
    const params = useLocalSearchParams();
    
    // Safely extract and normalize parameters from the URL
    const calendarId = (Array.isArray(params.calendarId) ? params.calendarId[0] : params.calendarId) as string;
    const calendarTitle = (Array.isArray(params.calendarTitle) ? params.calendarTitle[0] : params.calendarTitle) as string;
    const calendarTheme = (Array.isArray(params.calendarTheme) ? params.calendarTheme[0] : params.calendarTheme) as string;

    const { 
        fetchCalendarById, selectedCalendar, eventStamps, addStamp, addEvent, fetchStamps 
    } = useCalendar();

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isStampModalVisible, setIsStampModalVisible] = useState(false);
    const [newStampName, setNewStampName] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('📅');
    const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

    // Initial Data Fetch
    useEffect(() => {
        // --- 🛑 FIX APPLIED HERE ---
        const calendarAlreadyLoaded = selectedCalendar?.$id === calendarId;

        // Only proceed if a calendarId is available AND the correct calendar hasn't been loaded yet
        if (calendarId && !calendarAlreadyLoaded) {
             setIsLoading(true);
             Promise.all([
                 fetchStamps(),
                 fetchCalendarById(calendarId)
             ]).then(() => setIsLoading(false));
        } else if (calendarId && calendarAlreadyLoaded && eventStamps.length === 0) {
            // Also ensure stamps are fetched if the calendar is already loaded but stamps are missing
            fetchStamps();
        } else if (calendarAlreadyLoaded) {
            // If the calendar is already loaded, ensure loading is set to false
            setIsLoading(false);
        }
    }, [calendarId, fetchCalendarById, fetchStamps, selectedCalendar]);


    // Map events for the Calendar component
    const eventsByDateMap = useMemo(() => {
        const currentEvents = selectedCalendar?.$id === calendarId ? selectedCalendar.events : [];
        
        const map: Record<string, EventStamp[]> = {};

        currentEvents.forEach(event => {
            const stamp = eventStamps.find(s => s.$id === event.stamp_id);
            if (stamp) {
                // Normalize to YYYY-MM-DD (so keys match what react-native-calendars uses)
                const dateKey = event.date.split("T")[0];
                map[dateKey] = map[dateKey] || [];
                map[dateKey].push(stamp);
            }
        });
        return map;
    }, [selectedCalendar, eventStamps, calendarId]);

    // Marking for react-native-calendars
    const markedDates = useMemo(() => {
        const marks: { [date: string]: any } = {};
        
        if (selectedDateKey) {
            marks[selectedDateKey] = { selected: true, selectedColor: calendarTheme };
        }

        Object.keys(eventsByDateMap).forEach(date => {
            marks[date] = {
                ...(marks[date] || {}),
                dots: [{ color: calendarTheme, key: date }],
                marked: true,
            };
        });
        return marks;
    }, [selectedDateKey, calendarTheme, eventsByDateMap]);

    // --- Handlers ---
    
    const handleDayPress = useCallback((day: DateData) => {
        setSelectedDateKey(selectedDateKey === day.dateString ? null : day.dateString);
    }, [selectedDateKey]);

    const handleAddStamp = () => {
        if (!newStampName.trim() || !selectedEmoji.trim()) {
            Alert.alert("Error", "Please enter a name and select an emoji.");
            return;
        }
        addStamp(newStampName.trim(), selectedEmoji.trim());
        setNewStampName('');
        setSelectedEmoji('📅');
        setIsStampModalVisible(false);
    };

    const handleStampDay = async (stamp: EventStamp) => {
        if (!selectedDateKey) return;

        try {
            await addEvent(calendarId, stamp.$id, selectedDateKey);

            // 🛑 FIX APPLIED HERE: Do NOT call setSelectedDateKey(null).
            // Keeping the key active allows the component to re-render 
            // the modal content based on the updated eventsByDateMap.
            
        } catch (error) {
            Alert.alert("Error", "Failed to add event. Please try again.");
            console.error("Error stamping day:", error);
        }
    };


    // --- Renderers ---
    
    const renderStampSelector = () => {
        if (!selectedDateKey) return null;

        const stampedEventsOnDay = eventsByDateMap[selectedDateKey] || [];

        return (
            <Modal
                visible={!!selectedDateKey}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setSelectedDateKey(null)}
            >
                <View style={styles.stampSelectorCenteredView}>
                    <View style={styles.stampSelectorContent}>
                        <Text style={styles.stampSelectorHeader}>Stamp: {selectedDateKey}</Text>
                        
                        <Text style={styles.currentEventsTitle}>Events on this day:</Text>
                        <ScrollView style={styles.currentEventsScroll}>
                            {stampedEventsOnDay.length > 0 ? (
                                stampedEventsOnDay.map((stamp, index) => (
                                    <View key={index} style={styles.eventItem}>
                                        <Text style={{fontSize: 16, marginRight: 5}}>{stamp.event_emoji}</Text>
                                        <Text style={{fontSize: 14}}>{stamp.name}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={{color: '#999', paddingVertical: 5}}>No stamps added yet.</Text>
                            )}
                        </ScrollView>

                        <Text style={styles.currentEventsTitle}>Select a Stamp to Add:</Text>

                        {eventStamps.length === 0 ? (
                            <Text style={styles.emptyStampText}>
                                No stamps created yet. Use the button at the top to create one!
                            </Text>
                        ) : (
                            <ScrollView horizontal contentContainerStyle={styles.stampButtonsScrollContent}>
                                {eventStamps.map(stamp => (
                                    <TouchableOpacity
                                        key={stamp.$id}
                                        style={[styles.stampButton, { backgroundColor: calendarTheme }]}
                                        onPress={() => handleStampDay(stamp)}
                                        accessibilityLabel={`Add ${stamp.name} stamp`}
                                    >
                                        <Text style={{fontSize: 24}}>{stamp.event_emoji}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <TouchableOpacity
                            style={styles.closeSelectorButton}
                            onPress={() => setSelectedDateKey(null)}
                        >
                            <Text style={styles.closeSelectorText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderStampCreationModal = () => (
        <Modal
            visible={isStampModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsStampModalVisible(false)}
        >
            <View style={styles.modalCenteredView}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalHeader}>Create Event Stamp</Text>
                    
                    <Text style={styles.iconLabel}>Emoji:</Text>
                    <TextInput
                        style={[styles.input, styles.emojiInput]}
                        placeholder="Tap to open emoji keyboard"
                        placeholderTextColor="#999"
                        value={selectedEmoji}
                        onChangeText={setSelectedEmoji}
                        maxLength={2}
                        keyboardType={Platform.OS === 'ios' ? 'default' : 'visible-password'}
                    />
                    
                    <Text style={styles.iconLabel}>Name:</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Stamp Name (e.g., Workout)"
                        value={newStampName}
                        onChangeText={setNewStampName}
                    />

                    <View style={styles.modalButtons}>
                        <TouchableOpacity style={styles.modalCancelButton} onPress={() => setIsStampModalVisible(false)}>
                            <Text style={{ color: '#666' }}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.modalSaveButton, { backgroundColor: calendarTheme }]} onPress={handleAddStamp}>
                            <Text style={styles.stampCreatorText}>Save Stamp</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );

    // --- Main Render ---

    if (isLoading || (selectedCalendar?.$id !== calendarId && !selectedCalendar)) {
        return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={calendarTheme || '#007AFF'} /><Text>Loading Calendar...</Text></View>;
    }

    return (
        <SafeAreaView style={styles.fullContainer}>
            <View style={styles.container}>
                <Text style={[styles.mainTitle, { color: calendarTheme }]}>
                    {calendarTitle}
                </Text>
                
                <TouchableOpacity
                    style={[styles.stampCreatorButton, { backgroundColor: calendarTheme }]}
                    onPress={() => setIsStampModalVisible(true)}
                >
                    <Text style={styles.stampCreatorText}>+ Create New Stamp</Text>
                </TouchableOpacity>

                <Calendar
                    dayComponent={({ date, state, marking }) => {
                        if (!date) { return null; }
                        const dayState = state || '';

                        return (
                            <DayWithStamps
                                date={date}
                                state={dayState}
                                marking={marking}
                                onPress={handleDayPress}
                                eventsByDate={eventsByDateMap}
                                calendarTheme={calendarTheme}
                            />
                        );
                    }}
                    markingType={'custom'}
                    markedDates={markedDates}
                    theme={{
                        selectedDayBackgroundColor: 'rgba(0, 0, 0, 0.1)',
                        todayTextColor: calendarTheme,
                        arrowColor: calendarTheme,
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: '600',
                    }}
                />
                
                {renderStampSelector()}
                {renderStampCreationModal()}
            </View>
        </SafeAreaView>
    );
}

// --- Styles (unchanged) ---

const styles = StyleSheet.create({
    fullContainer: { flex: 1, backgroundColor: '#fff' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 10,
    },
    mainTitle: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        paddingVertical: 10,
    },
    stampCreatorButton: {
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 15,
        ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2 }, android: { elevation: 3 } }),
    },
    stampCreatorText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    customDayContainer: {
        width: '100%',
        minHeight: 60,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    customDayText: {
        fontSize: 14,
        marginBottom: 2,
    },
    customDayMarkers: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        minHeight: 18,
    },
    emojiMarker: {
        fontSize: 12,
        marginHorizontal: 1,
    },
    stampSelectorCenteredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    stampSelectorContent: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
    },
    stampSelectorHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    currentEventsTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 10,
        marginBottom: 5,
    },
    emptyStampText: {
        color: '#888',
        textAlign: 'center',
        paddingVertical: 15,
        fontStyle: 'italic',
    },
    currentEventsScroll: {
        maxHeight: 60,
        marginBottom: 10,
    },
    eventItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 3,
    },
    stampButtonsScrollContent: {
        paddingVertical: 5,
    },
    stampButton: {
        borderRadius: 25,
        padding: 10,
        marginRight: 10,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 40,
    },
    closeSelectorButton: {
        marginTop: 10,
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: '#eee',
    },
    closeSelectorText: {
        color: '#333',
        fontWeight: '500',
    },
    modalCenteredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
    },
    modalHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    input: {
        height: 40,
        borderColor: '#ccc',
        borderWidth: 1,
        borderRadius: 5,
        paddingHorizontal: 10,
        marginBottom: 15,
    },
    emojiInput: {
        fontSize: 24,
        textAlign: 'center',
    },
    iconLabel: {
        fontSize: 16,
        marginBottom: 8,
        fontWeight: '500',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },
    modalCancelButton: {
        padding: 10,
        borderRadius: 5,
    },
    modalSaveButton: {
        padding: 10,
        borderRadius: 5,
        paddingHorizontal: 15,
        marginLeft: 10,
    },
});