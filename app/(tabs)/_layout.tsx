import { Tabs } from "expo-router";



export default function TabsLayout() {
  return (
    <Tabs screenOptions={{tabBarActiveTintColor: "coral"}}>
      <Tabs.Screen name ='index' options={{title: "Home"}}/>
      <Tabs.Screen name ='profile' options={{title: "Profile"}}/>
    </Tabs>
  );
}