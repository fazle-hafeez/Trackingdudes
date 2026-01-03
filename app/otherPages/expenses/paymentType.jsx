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
import { useLocalSearchParams } from "expo-router";
import { router } from "expo-router";

const CACHE_KEY = "expense_cache_data"; // same cache key as Expense page

const PaymentType = () => {
  const { showModal, setGlobalLoading, hideModal } = useAuth();
  const { offlineQueue, isConnected } = useContext(OfflineContext);
  const { id = null } = useLocalSearchParams()
  const { post, put } = useApi();

  const [paymentName, setPaymentName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("");
  const [message, setMessage] = useState("");
  const [messageStatus, setMessageStatus] = useState(false);
  const [paymentList, setPaymentList] = useState([]);
  const [isFocused, setIsFocused] = useState(false)

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

  useEffect(() => {
    (async () => {
      const cachedWrap = (await readCache(CACHE_KEY)) || {};
      const cachedPayments = Array.isArray(cachedWrap["payment-type"]) ? cachedWrap["payment-type"] : [];

      setPaymentList(cachedPayments);

      // If editing → load selected
      if (id) {
        const old = cachedPayments.find((p) => p.id.toString() === id.toString());
        if (old) {
          setPaymentName(old.label);
          setSelectedIcon(old.icon);
        }
      }
    })();
  }, []);

  // check name availability
  useEffect(() => {
    if (!isFocused) return;

    if (!paymentName?.trim()) {
      setMessage("");
      setMessageStatus(false);
      return;
    }

    const duplicate = paymentList.some((i) => {
      if (id && i.id.toString() === id.toString()) return false;
      return i.label.toLowerCase() === paymentName.trim().toLowerCase();
    });

    if (duplicate) {
      setMessage("This name is already used");
      setMessageStatus(true);
    } else {
      setMessage("Name is available");
      setMessageStatus(false);
    }
  }, [paymentName, paymentList]);

  // ADD PAYMENT TYPE
  const handleAdd = async () => {
    if (!paymentName.trim() || !selectedIcon) {
      showModal("Enter payment method & select icon", "error");
      return;
    }
    if (messageStatus) {
      showModal("Duplicate name, choose another", "error");
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
        pending: !isConnected,
        serverId: null,
        type: "payment-type",
      };

      // Update UI
      setPaymentList((prev) => [...prev, newPayment]);
      setPaymentName("");
      setSelectedIcon("");

      // Update cache
      const cachedWrap = (await readCache(CACHE_KEY)) || {};
      const prevList = Array.isArray(cachedWrap["payment-type"]) ? cachedWrap["payment-type"] : [];

      cachedWrap["payment-type"] = [...prevList, newPayment];
      await storeCache(CACHE_KEY, cachedWrap);

      let isOffline = false;

      // TRY ONLINE SAVE
      if (isConnected) {
        try {
          const res = await post("/payment-type/create", {
            label: newPayment.label,
            value: newPayment.value,
            icon: newPayment.icon,
          });

          // SAVE SERVER ID
          newPayment.serverId = res?.data?.id ?? null;
          newPayment.pending = false;
        } catch (e) {
          isOffline = true;
        }
      } else {
        isOffline = true;
      }

      // UPDATE cache again
      cachedWrap["payment-type"] = cachedWrap["payment-type"].map((p) =>
        p.id === newPayment.id ? newPayment : p
      );

      await storeCache(CACHE_KEY, cachedWrap);

      showModal(
        isOffline
          ? "Saved locally. Will sync when online."
          : "Payment type saved successfully!",
        isOffline ? "warning" : "success",
        false,
        [
          {
            label: "Add More",
            bgColor: "bg-green-600",
            onPress: () => {
              hideModal();
            }
          },
          {
            label: "View All",
            bgColor: "bg-blue-600",
            onPress: () => {
              hideModal();
              router.back();
            }
          }
        ]
      );
    } finally {
      setGlobalLoading(false);
    }
  };

  // UPDATE PAYMENT TYPE (same as vendor update)
  const handleUpdate = async () => {
    if (!paymentName.trim() || !selectedIcon) {
      showModal("Enter payment method & select icon", "error");
      return;
    }

    if (messageStatus) {
      showModal("Name already used", "error");
      return;
    }

    setGlobalLoading(true);

    try {
      const cachedWrap = (await readCache(CACHE_KEY)) || {};
      const list = Array.isArray(cachedWrap["payment-type"]) ? cachedWrap["payment-type"] : [];

      const old = list.find((p) => p.id.toString() === id.toString());
      if (!old) {
        showModal("Payment type not found", "error");
        return;
      }

      const updated = {
        ...old,
        label: paymentName.trim(),
        name: paymentName.trim(),
        value: paymentName.trim().toLowerCase().replace(/\s/g, "-"),
        icon: selectedIcon,
        pending: !isConnected ? true : false,
      };

      const updatedList = list.map((p) => (p.id === old.id ? updated : p));
      cachedWrap["payment-type"] = updatedList;

      await storeCache(CACHE_KEY, cachedWrap);
      setPaymentList(updatedList);

      let isOffline = false;

      if (isConnected) {
        try {
          await post("/payment-type/update", {
            id: old.serverId ?? id,
            label: updated.label,
            value: updated.value,
            icon: updated.icon,
          });
          updated.pending = false;
        } catch {
          isOffline = true;
        }
      } else {
        isOffline = true;
      }

      await storeCache(CACHE_KEY, cachedWrap);

      showModal(
        isOffline
          ? "Updated locally. Will sync when online."
          : "Updated successfully!",
        "success",
        false,
        [
          {
            label: "View",
            bgColor: "bg-green-600",
            onPress: () => {
              hideModal();
            }
          },
          {
            label: "View All",
            bgColor: "bg-blue-600",
            onPress: () => {
              hideModal();
              router.back();
            }
          }
        ]

      );
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <SafeAreacontext className="flex-1" bgColor="#eff6ff">
      <PageHeader routes={`${id ? "Edit" : "Adding"} Payment Method`} />
      <View className="p-4 flex-1">
        <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
          <ThemedText color="#374151" className="text-center text-lg font-medium mb-1">
            {`${id ? "Edit" : "Adding"} Payment Method`}
          </ThemedText>
        </ThemedView>

        <ThemedView className="p-4 rounded-lg mb-5" style={{ elevation: 2 }}>
          <ThemedText className="mb-1">Payment method:</ThemedText>
          <Input
            placeholder="Enter a label for the payment method"
            value={paymentName}
            onchange={setPaymentName}
            onFocus={() => setIsFocused(true)}
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

        <Button title={id ? "Update" : "Save"}
          onClickEvent={id ? handleUpdate : handleAdd} />

        <ThemedText color="#374151" className="mt-4 text-lg">
          Please choose an icon that best represents this payment method. This helps identify payment methods quickly in the app.
        </ThemedText>
      </View>
    </SafeAreacontext>
  );
};

export default PaymentType;
