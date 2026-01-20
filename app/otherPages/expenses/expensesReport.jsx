import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { View, FlatList, TouchableOpacity } from "react-native";
import { FontAwesome, FontAwesome6, Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

// Contexts / Hooks
import { useTheme } from "../../../src/context/ThemeProvider";
import { useAuth } from "../../../src/context/UseAuth";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import usePersistentValue from "../../../src/hooks/usePersistentValue";
import { readCache, storeCache } from "../../../src/offline/cache";
import { useApi } from "../../../src/hooks/useApi";
import { mergePendingAndNormalize, formatCurrency, DATE_TABS, getDateRange, parseIconString  } from "../../../src/helper";

// Components
import Tabs from "../../../src/components/Tabs";
import { ThemedView, ThemedText, SafeAreacontext } from "../../../src/components/ThemedColor";
import PageHeader from "../../../src/components/PageHeader";
import ProjectCountModal from "../../../src/components/ProjectCountModal";
import Input from "../../../src/components/Input";
import LoadingSkeleton from "../../../src/components/LoadingSkeleton";
import CheckBox from "../../../src/components/CheckBox";
import BottomActionBar from "../../../src/components/ActionBar";
import Pagination from "../../../src/components/Pagination";
import { AddFilterCard, FilterChip } from "../../../src/components/AddEntityCard";

const CACHE_KEY = "expenses-cache";


// check every icon type

const ICON_MAP = {
  FontAwesome: FontAwesome,
  FontAwesome5: FontAwesome,
  FontAwesome6: FontAwesome6,
  Ionicons: Ionicons,
  Material: MaterialIcons,
};


// ---------------- COMPONENT ----------------
const Expenses = () => {
  const { darkMode } = useTheme();
  const { showModal, hideModal, setGlobalLoading } = useAuth();
  const { isConnected } = useContext(OfflineContext);
  const { get, del } = useApi();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [expensesReports, setExpensesReports] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const tabs = Object.values(DATE_TABS);
  const [activeTab, setActiveTab] = useState(DATE_TABS.THIS_WEEK);
  const { from, to } = getDateRange(activeTab);

  const inputBgColor = darkMode ? "bg-transparent" : "bg-white";

  const { modalVisible, storedValue: fetchExpense, saveValue: setFetchExpense, setModalVisible } = usePersistentValue("@expense-tracking");

  // ===== for cleaning the code used this function ===========
  const normalizeExpenseIcons = (expense) => {
    const vendorIcon = parseIconString(expense.vendor_icon);
    const categoryIcon = parseIconString(expense.category_icon);
    const paymentIcon = parseIconString(expense.payment_option_icon);
    const projectIcon = parseIconString(expense.project_icon)

    return {
      ...expense,
      vendorIcon,
      categoryIcon,
      paymentIcon,
      projectIcon
    };
  };


  // ---------------- FETCH EXPENSES ----------------
  const fetchExpenses = async (pageNumber = 1, shouldUpdateCache = false) => {
    try {
      setLoading(true);
      const result = await get(
        `my-expenses/?date_from=${from}&date_to=${to}&limit=${fetchExpense || 10}&page=${pageNumber}&_t=${isConnected ? Date.now() : 0}`,
        true
      );
      console.log('fetch expenses is :', result);

      let apiData = Array.isArray(result?.data) ? result.data : [];

      if (isConnected && result?.pagination) {
        setPage(result.pagination.current_page || pageNumber);
        setTotalPages(result.pagination.total_pages || 1);
      } else {
        setPage(1);
        setTotalPages(1);
      }

      // Read Caches
      const cachedPendingRaw = await readCache("pendingUpdates") || {};
      const cachedPending = mergePendingAndNormalize(cachedPendingRaw);
      const allCachedWrap = await readCache(CACHE_KEY) || { data: [] };
      const allCached = Array.isArray(allCachedWrap.data) ? allCachedWrap.data : [];

      // Offline Queue
      const offlineQueue = (await readCache("offlineQueue")) || [];
      const pendingAdds = offlineQueue
        .filter(i => i.endpoint?.includes("create-expense") && i.method === "post")
        .map(i => ({
          ...i.body,
          tempId: i.body.tempId || `local_${Date.now()}`,
          pending: true
        }));

      // Merge Logic (MyProjects Pattern)
      const mergedMap = new Map();
      apiData.forEach(e => mergedMap.set(e.id, { ...e, pending: false }));
      pendingAdds.forEach(e => mergedMap.set(e.tempId, normalizeExpenseIcons(e)));

      // Merge items from cache that have pending updates
      allCached.forEach(item => {
        const id = item.id || item.tempId;
        if (id && cachedPending[id]) {
          mergedMap.set(id, { ...item, pending: true });
        }
      });

      const finalList = Array.from(mergedMap.values());
      setExpensesReports(finalList);

      if (isConnected || shouldUpdateCache) {
        await storeCache(CACHE_KEY, { data: finalList, timestamp: Date.now() });
      }

    } catch (err) {
      console.error("Fetch error, falling back to cache:", err);
      const cachedWrap = await readCache(CACHE_KEY);
      const safeCached = (cachedWrap?.data || []).map(e => normalizeExpenseIcons(e));
      setExpensesReports(safeCached);
    }
    finally {
      setLoading(false);
    }
  };

  // ---------------- FOCUS EFFECT (MyProjects Style) ----------------

  useFocusEffect(
    useCallback(() => {

      const checkActionsAndFetch = async () => {
        try {
          setLoading(true);

          const newRec = await readCache("newRecordAdded");
          const delRec = await readCache("recordDeleted");
          const upRec = await readCache("recordUpdated");

          if (newRec || delRec || upRec) {
            await fetchExpenses(1, true); // Force refresh
            if (newRec) await storeCache("newRecordAdded", false);
            if (delRec) await storeCache("recordDeleted", false);
            if (upRec) await storeCache("recordUpdated", false);
          } else {
            await fetchExpenses(1);
          }
        } catch (err) {
          console.error("Focus effect error:", err);
        }
      };

      checkActionsAndFetch();

    }, [activeTab, fetchExpense])
  );

  // ---------------- SELECTION ----------------
  const handleSelectAll = () => {
    setSelectAll(prev => {
      const next = !prev;
      const valid = filteredExpenses.map(v => v.id || v.tempId);
      setSelectedExpenses(next ? valid : []);
      return next;
    });
  };

  const toggleSelect = (id) => {
    setSelectedExpenses(prev => {
      const updated = prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id];
      const allIds = filteredExpenses.map(v => v.id || v.tempId);
      setSelectAll(updated.length === allIds.length);
      return updated;
    });
  };

  const handleCancel = () => {
    setSelectionMode(false);
    setSelectedExpenses([]);
    setSelectAll(false);
  };

  const confirmDelete = async (ids) => {
    if (!isConnected) {
      showModal("Offline mode — You cannot delete items", "error");
      return;
    }
    setGlobalLoading(true);
    try {
      const res = await del("my-expenses/delete", { expense_ids: ids });
      if (res?.status === "success") {
        const updated = expensesReports.filter(e => !ids.includes(e.id));
        setExpensesReports(updated);
        await storeCache(CACHE_KEY, { data: updated });
        showModal(`${ids.length} record(s) deleted`, "success");
      } else {
        showModal(res?.data || "Failed to delete", "error");
      }
    } catch (err) {
      console.error(err);
      showModal("Error deleting expenses", "error");
    } finally {
      setGlobalLoading(false);
      handleCancel();
    }
  };

  const deleteExpense = () => {
    if (selectedExpenses.length === 0) {
      showModal("Please select at least one item", "error");
      return;
    }
    showModal(
      "You're about to delete selected expenses...",
      "warning",
      "Deleting Expenses?",
      [
        { label: "Yes, delete", bgColor: "bg-red-600", onPress: () => { hideModal(); confirmDelete(selectedExpenses); } },
        { label: "Cancel", bgColor: "bg-green-600", onPress: () => { hideModal(); handleCancel(); } }
      ]
    );
  };

  // ---------------- FILTERED ----------------
  const filteredExpenses = useMemo(() => {
    return expensesReports.filter(e => e.category?.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [expensesReports, searchQuery]);

  // ---------------- EXPENSE ITEM ----------------
  const ExpenseItem = ({ item }) => {
    const id = item.id || item.tempId;
    const isSelected = selectedExpenses.includes(id);

    return (
      <TouchableOpacity
        onLongPress={() => {
          if (!selectionMode) {
            setSelectionMode(true);
            setSelectedExpenses([id]);
          }
        }}
        onPress={() => {
          if (selectionMode) toggleSelect(id);
          else router.push({ pathname: "/otherPages/expenses/addExpenses", params: { id } });
        }}
        activeOpacity={0.8}
        className="mb-4"
      >
        <View
          className={`
            rounded-xl p-4 shadow-sm border flex-row
            ${isSelected ? darkMode ? "border-blue-500" : " border-blue-700 bg-white" :
              item.pending ? "border-yellow-400 bg-yellow-50" :
                darkMode ? "border-gray-700" : "bg-white border-gray-100"}
          `}
          style={{ elevation: 5 }}
        >
          <View className="flex-1">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                {selectionMode && (
                  <CheckBox value={isSelected} onClick={() => toggleSelect(id)} className="mr-3" />
                )}
                <View className="bg-purple-100 p-2 rounded-full mr-1">
                  <DynamicIcon
                    type={item.categoryIcon?.type}
                    name={item.categoryIcon?.name}
                    size={16}
                    color="#7c3aed"
                    fallbackType="Ionicons"
                    fallbackName="pricetag-outline"
                  />
                </View>
                <View className="ml-2">
                  <ThemedText className="text-base font-semibold">{item?.category}</ThemedText>
                  <ThemedText>{item.date}</ThemedText>
                </View>
              </View>
              <ThemedText className=" mb-4">{formatCurrency(item?.amount)}</ThemedText>
            </View>

            <View className={`${darkMode ? "border-gray-500" : "border-yellow-400"} mb-5 border-b`} />

            <View className="flex-row justify-between mb-3">
              <View className="flex-row items-center w-[48%]">
                <View className="bg-green-100 p-2 rounded-full mr-2">
                  <DynamicIcon
                    type={item.paymentIcon?.type}
                    name={item.paymentIcon?.name}
                    size={16}
                    color="#15803d"
                    fallbackType="FontAwesome"
                    fallbackName="credit-card"
                  />
                </View>
                <View>
                  <ThemedText className="text-xs text-gray-400">Payment Type</ThemedText>
                  <ThemedText>{item?.paymentType}</ThemedText>
                </View>
              </View>

              <View className="flex-row items-center w-[48%]">
                <View className="bg-orange-100 p-2 rounded-full mr-2">
                  <DynamicIcon
                    type={item.vendorIcon?.type}
                    name={item.vendorIcon?.name}
                    size={16}
                    color="#c2410c"
                    fallbackType="Ionicons"
                    fallbackName="storefront-outline"
                  />
                </View>
                <View>
                  <ThemedText className="text-xs text-gray-400">Vendor</ThemedText>
                  <ThemedText>{item?.vendor}</ThemedText>
                </View>
              </View>
            </View>

            <View className="flex-row items-center w-[48%]">
              <View className="bg-blue-100 p-2 rounded-full mr-2">
                <DynamicIcon
                  type={item.projectIcon?.type}
                  name={item.projectIcon?.name}
                  size={16}
                  color="#2563eb"
                  fallbackType="FontAwesome6"
                  fallbackName="folder-open"
                />
              </View>
              <View>
                <ThemedText className="text-xs text-gray-400">Project</ThemedText>
                <ThemedText>{item?.project}</ThemedText>
              </View>
            </View>

            {item.memo && (
              <View className="mt-3 px-2">
                <ThemedText className="text-sm text-gray-600 mt-1">{item.memo}</ThemedText>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyList = () => (
    <ThemedView className="rounded-lg mt-2 items-center justify-center py-10">
      <Ionicons name="receipt-outline" size={48} color="#9ca3af" />
      <ThemedText className="mt-4 text-base text-gray-400">No expenses listed yet</ThemedText>
      <ThemedText className="text-sm text-gray-400 mt-1">Start by adding your first expense</ThemedText>
    </ThemedView>
  );

  return (
    <SafeAreacontext className="flex-1">
      <PageHeader
        routes="Expenses Tracking"
        showMenu={true}
        onMenuPress={() => router.push("/otherPages/expenses/expense")}
      />

      <View className="px-3 flex-1">
        <View className="my-4">
          <Tabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
        </View>

        <AddFilterCard title="Add Expenses" filterItem={() => { }} onchange={() => router.push("/otherPages/expenses/addExpenses")} />

        <View className="flex-row flex-wrap mb-4">
          <FilterChip label={`dates: ${from} to ${to}`} />
          <FilterChip label="project: all" />
        </View>

        <Input
          className={`${inputBgColor} mb-3`}
          placeholder="Search expenses..."
          icon={true}
          value={searchQuery}
          borderColors="#ddd"
          onchange={setSearchQuery}
        />

        {selectionMode && filteredExpenses.length > 0 && (
          <ThemedView className="flex-row items-center mb-3 rounded-lg shadow-sm p-3 px-4">
            <CheckBox value={selectAll} onClick={handleSelectAll} />
            <ThemedText className="ml-2 text-lg font-medium">Select All ({selectedExpenses.length})</ThemedText>
          </ThemedView>
        )}

        {loading ? (
          <LoadingSkeleton count={3} height={100} spacing={15} />
        ) : (
          <>
            <FlatList
              data={filteredExpenses}
              keyExtractor={(item) => item.id || item.tempId}
              renderItem={({ item }) => <ExpenseItem item={item} />}
              ListEmptyComponent={EmptyList}
              contentContainerStyle={{ paddingBottom: selectionMode ? 60 : 10 }}
            />

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={(newPage) => fetchExpenses(newPage)}
              />
            )}
          </>
        )}
      </View>

      {selectionMode && (
        <View className="absolute bottom-0 left-0 right-0">
          <BottomActionBar actionType="editView" handleDelete={deleteExpense} handleCancel={handleCancel} />
        </View>
      )}

      <ProjectCountModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSelect={(value) => {
          setFetchExpense(value);
          setModalVisible(false);
        }}
      />
    </SafeAreacontext>
  );
};

const DynamicIcon = ({
  type,
  name,
  size = 16,
  color = "#000",
  fallbackType = "Ionicons",
  fallbackName = "pricetag-outline",
}) => {
  const IconComponent = ICON_MAP[type] || ICON_MAP[fallbackType];

  return (
    <IconComponent
      name={name || fallbackName}
      size={size}
      color={color}
    />
  );
};


export default Expenses;
