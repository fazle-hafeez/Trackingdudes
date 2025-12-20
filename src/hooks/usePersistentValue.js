import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function usePersistentValue(storageKey) {
    const [modalVisible, setModalVisible] = useState(false);
    const [storedValue, setStoredValue] = useState(null);
    const [loaded, setLoaded] = useState(false);

    // Load value on component mount
    useEffect(() => {
        const loadValue = async () => {
            try {
                const value = await AsyncStorage.getItem(storageKey);

                if (!value) {
                    setModalVisible(true);
                } else {
                    setStoredValue(JSON.parse(value));
                }
            } catch (error) {
                console.log("Error loading storage:", error);
            } finally {
                setLoaded(true);
            }
        };

        loadValue();
    }, [storageKey]);

    // Save any value
    const saveValue = async (value) => {
        try {
            await AsyncStorage.setItem(storageKey, JSON.stringify(value));
            setStoredValue(value);
            setModalVisible(false);
        } catch (error) {
            console.log("Error saving storage:", error);
        }
    };

    return {
        modalVisible,
        setModalVisible,
        storedValue,
        saveValue,
        loaded,
    };
}
