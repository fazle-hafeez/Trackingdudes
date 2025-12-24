import React, { useState, useEffect, useContext } from "react";
import { View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import Button from "../../../src/components/Button";
import Input from "../../../src/components/Input";
import Select from "../../../src/components/Select";
import { readCache, storeCache } from "../../../src/offline/cache";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import { useApi } from "../../../src/hooks/useApi";
import { useAuth } from "../../../src/context/UseAuth";

const CACHE_KEY = "expense_cache_data"; // same cache key as Expense page

const PaymentType = () => {
  const { showModal, setGlobalLoading } = useAuth();
  const { offlineQueue, isConnected } = useContext(OfflineContext);
  const { post } = useApi();

  const [paymentName, setPaymentName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");
  const [message, setMessage] = useState("");
  const [messageStatus, setMessageStatus] = useState(false);
  const [paymentList, setPaymentList] = useState([]);

  const iconOptions = [
    { icon: "cash-outline", label: "Cash" },
    { icon: "card-outline", label: "Card" },
    { icon: "wallet-outline", label: "Wallet" },
    { icon: "logo-paypal", label: "PayPal" },
    { icon: "logo-apple", label: "Apple Pay" },
    { icon: "logo-google", label: "Google Pay" },
    { icon: "logo-bitcoin", label: "Crypto" },
    { icon: "cash-outline", label: "Check" },
    { icon: "swap-horizontal-outline", label: "Bank Transfer" },
    { icon: "globe-outline", label: "Online" },
  ];

  // Load cached payments on mount
  useEffect(() => {
    (async () => {
      const cachedWrap = (await readCache(CACHE_KEY)) || {};
      const cachedPayments = Array.isArray(cachedWrap["payment-type"]) ? cachedWrap["payment-type"] : [];
      setPaymentList(cachedPayments);
    })();
  }, []);

  // Check name availability
  useEffect(() => {
    if (!paymentName?.trim()) {
      setMessage("");
      setMessageStatus(false);
      return;
    }
    const duplicate = paymentList.some(
      (p) => p?.label?.toLowerCase() === paymentName.trim().toLowerCase()
    );
    if (duplicate) {
      setMessage("This name is already used");
      setMessageStatus(true);
    } else {
      setMessage("Name is available");
      setMessageStatus(false);
    }
  }, [paymentName, paymentList]);

  const handleAddPayment = async () => {
    if (!paymentName?.trim() || !selectedIcon) {
      showModal("Enter payment type and select icon", "error");
      return;
    }
    if (messageStatus) {
      showModal("Name already used, choose another", "error");
      return;
    }

    setGlobalLoading(true);
    try {
      const newPayment = {
        id: Date.now().toString(),
        label: paymentName.trim(),
        name: paymentName.trim(),
        value: paymentName.trim().toLowerCase().replace(/\s/g, "-"),
        icon: selectedIcon,
        pending: true,
        type: "payment-type",
      };

      // Update UI immediately
      setPaymentList((prev) => [...prev, newPayment]);
      setPaymentName("");
      setSelectedIcon("");
      setMessage("");
      setMessageStatus(false);

      // Update cache
      const cachedWrap = (await readCache(CACHE_KEY)) || {};
      const prevPayments = Array.isArray(cachedWrap["payment-type"]) ? cachedWrap["payment-type"] : [];
      cachedWrap["payment-type"] = [...prevPayments, newPayment];
      await storeCache(CACHE_KEY, cachedWrap);

      // Attempt online save
      let isOffline = false;
      if (isConnected) {
        try {
          await post("/payment-type/create", {
            label: newPayment.label,
            value: newPayment.value,
            icon: newPayment.icon,
          });
          newPayment.pending = false;
        } catch (err) {
          isOffline = true;
        }
      } else {
        isOffline = true;
      }

      // Update cache with online status
      cachedWrap["payment-type"] = cachedWrap["payment-type"].map((p) =>
        p.id === newPayment.id ? newPayment : p
      );
      await storeCache(CACHE_KEY, cachedWrap);

      showModal(
        isOffline
          ? "Payment method saved locally. It will sync when online."
          : "Payment method saved successfully online!",
        isOffline ? "warning" : "success"
      );
    } catch (err) {
      console.error(err);
      showModal("Failed to save payment method", "error");
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SafeAreacontext className="flex-1" bgColor="#eff6ff">
      <PageHeader routes="Adding Payment Method" />
      <View className="p-4 flex-1">
        <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
          <ThemedText color="#374151" className="text-center text-lg font-medium mb-1">
            Add Payment Method
          </ThemedText>
        </ThemedView>

        <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
          <ThemedText className="mb-1">Payment method:</ThemedText>
          <Input
            placeholder="Enter a label for the payment method"
            value={paymentName}
            onchange={setPaymentName}
          />
          {message ? (
            <ThemedText className="mt-1" color={messageStatus ? "#dc2626" : "#16a34a"}>
              {message}
            </ThemedText>
          ) : null}
        </ThemedView>

        <ThemedView className="p-4 rounded-lg mb-3" style={{ elevation: 2 }}>
          <ThemedText className="mb-2">Choose an icon:</ThemedText>
          <Select
            items={iconOptions.map((icon) => ({
              label: icon.label,
              value: icon.icon,
              icon: icon.icon,
            }))}
            value={selectedIcon}
            onChange={setSelectedIcon}
            iconVisibility={true}
            placeholder="Select icon"
          />
        </ThemedView>

        {paymentName && selectedIcon && (
          <ThemedView
            className="flex-row items-center p-4 rounded-xl mb-3"
            style={{ elevation: 5, borderColor: "#2563eb", borderWidth: 1 }}
          >
            <Ionicons name={selectedIcon} size={28} color="#2563eb" className="mr-3" />
            <ThemedText className="text-base font-semibold">{paymentName}</ThemedText>
          </ThemedView>
        )}

        <Button title="Save" onClickEvent={handleAddPayment} />

        <ThemedText color="#374151" className="mt-4 text-lg">
          Please choose an icon that best represents this payment method. This helps identify payment methods quickly in the app.
        </ThemedText>
      </View>
    </SafeAreacontext>
  );
};

export default PaymentType;
