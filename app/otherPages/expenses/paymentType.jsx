import React, { useState } from "react";
import { View, Text } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import Button from "../../../src/components/Button";
import Input from "../../../src/components/Input";
import Select from "../../../src/components/Select";

const PaymentType = () => {
    const [paymentName, setPaymentName] = useState("");
    const [selectedIcon, setSelectedIcon] = useState("");
    const [paymentList, setPaymentList] = useState([]);

    const iconOptions = [
        "cash-outline",
        "card-outline",
        "checkmark-circle-outline",
        "swap-horizontal-outline",
        "wallet-outline",
        "logo-paypal",
        "logo-apple",
        "logo-google",
        "logo-bitcoin",
        "logo-facebook",
    ];

    const handleAddPayment = () => {
        if (!paymentName || !selectedIcon) {
            alert("Please enter payment type and select an icon");
            return;
        }

        const newPayment = {
            label: paymentName,
            value: paymentName.toLowerCase().replace(/\s/g, "-"),
            icon: selectedIcon,
        };

        setPaymentList([...paymentList, newPayment]);
        setPaymentName("");
        setSelectedIcon("");
    };

    return (
        <SafeAreacontext className="flex-1">
            <PageHeader routes="Vendor Tracking" />

            <View className="p-4 flex-1">
                {/* Card with title */}
                <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
                    <ThemedText color="#374151" className="text-center text-lg font-medium mb-1">
                        Add Payment Type
                    </ThemedText>
                </ThemedView>

                {/* Payment Name Input */}
                <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
                    <ThemedText className="mb-1">Payment type:</ThemedText>
                    <Input placeholder="Type payment name..." value={paymentName} onchange={setPaymentName} />
                </ThemedView>

                {/* Icon Select */}
                <ThemedView className="p-4 rounded-lg mb-3" style={{ elevation: 2 }}>
                    <ThemedText className="mb-2">Choose an icon:</ThemedText>
                    <Select
                        items={iconOptions.map(icon => ({ label: icon, value: icon }))}
                        value={selectedIcon}
                        onChange={setSelectedIcon}
                        placeholder="Select icon"
                    />
                </ThemedView>

                {/* Bottom display of selected icon & label */}
                {paymentName && selectedIcon && (
                    <ThemedView
                        className=" flex-row items-center p-4 rounded-xl shadow-lg"
                        style={{ elevation: 5 }}
                    >
                        <Ionicons name={selectedIcon} size={28} color="#2563eb" className="mr-3" />
                        <ThemedText className="text-base font-semibold">{paymentName}</ThemedText>
                    </ThemedView>
                )}

                {/* Submit Button */}
                <Button title="Add Payment Type" onPress={handleAddPayment} />

                <ThemedText color="#374151" className="mt-4   text-lg">
                    Please select a single icon that best represents this payment type.
                    This icon will help you and others quickly identify the payment method in the app.

                </ThemedText>


            </View>
        </SafeAreacontext>
    );
};

export default PaymentType;
