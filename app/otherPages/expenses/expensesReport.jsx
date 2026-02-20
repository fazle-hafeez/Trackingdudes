import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
import { View, FlatList, TouchableOpacity, RefreshControl, Text,Image } from "react-native";
import { FontAwesome, FontAwesome5, FontAwesome6, Ionicons, MaterialIcons, AntDesign, Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

// Contexts / Hooks
import { useTheme } from "../../../src/context/ThemeProvider";
import { useAuth } from "../../../src/context/UseAuth";
import { OfflineContext } from "../../../src/offline/OfflineProvider";
import usePersistentValue from "../../../src/hooks/usePersistentValue";
import { readCache, storeCache } from "../../../src/offline/cache";
import { useApi } from "../../../src/hooks/useApi";
import { RenderIcon } from "../../../src/helper";
import { formatCurrency, DATE_TABS, getDateRange, parseIconString } from "../../../src/helper";

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
  font: FontAwesome,
  FontAwesome5: FontAwesome,
  font5: FontAwesome,      // API key
  FontAwesome6: FontAwesome6,
  Ionicons: Ionicons,
  MaterialIcons: MaterialIcons,
  fa: FontAwesome,
  fa5: FontAwesome5,
  fa6: FontAwesome6,
  font6: FontAwesome6,
  ant: AntDesign,
  mat: MaterialIcons,
  mater: MaterialIcons,
  fth: Feather,
  fthr: Feather,
  ion: Ionicons
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
  const [refreshing, setRefreshing] = useState(false);
  const [order, setOrder] = useState("asc");


  const inputBgColor = darkMode ? "bg-transparent" : "bg-white";

  const { modalVisible, storedValue: fetchExpense, saveValue: setFetchExpense, setModalVisible } = usePersistentValue("@expense-tracking");

  // ===== for cleaning the code used this function ===========
  const normalizeExpenseIcons = (expense) => {
    // parseIconString agar null bhej raha hai toh hum empty object {} use karenge
    const vendorIcon = parseIconString(expense.vendor_icon) || {};
    const categoryIcon = parseIconString(expense.category_icon) || {};
    const paymentIcon = parseIconString(expense.payment_option_icon) || {};
    const projectIcon = parseIconString(expense.project_icon) || {};

    return {
      ...expense,
      vendorIcon,
      categoryIcon,
      paymentIcon,
      projectIcon
    };

  };

  // date arrange  helper function
  const isDateInRange = (date, from, to) => {
    if (!date || !from || !to) return false;

    const d = new Date(date);
    const f = new Date(from);
    const t = new Date(to);

    d.setHours(0, 0, 0, 0);
    f.setHours(0, 0, 0, 0);
    t.setHours(23, 59, 59, 999);

    return d >= f && d <= t;
  };


  // ---------------- FETCH EXPENSES ----------------
  const fetchExpenses = async (
    pageNumber = 1,
    currentOrder = order,

  ) => {

    /* ===============================
       1️⃣ BUILD TAB-WISE CACHE KEY
       =============================== */

    // Each tab + date range has its own cache
    // Example:
    // expenses_this-week_2026-02-01_2026-02-07
    const TAB_CACHE_KEY = `expenses_${activeTab}_${from}_${to}`;

    try {

      setLoading(true)
      let apiData = [];
      let apiSuccess = false;

      /* ===============================
         2️⃣ TRY ONLINE FETCH FIRST
         =============================== */

      if (isConnected) {
        try {
          const query =
            `date_from=${from}` +
            `&date_to=${to}` +
            `&order=${currentOrder}` +
            `&limit=${fetchExpense}` +
            `&page=${pageNumber}` +
            `&_t=${Date.now()}`;

          const res = await get(`my-expenses?${query}`, {
            useBearerAuth: true
          });

          console.log("fresh data:", res);

          // Validate response
          if (res?.status === "success" && Array.isArray(res.data)) {
            apiData = res.data.map(item => normalizeExpenseIcons(item));
            apiSuccess = true;
          }

          // Pagination handling
          if (isConnected && res?.pagination) {
            setPage(res?.pagination.current_page || pageNumber);
            setTotalPages(res?.pagination.total_pages || 1)

          } else {
            setPage(1);
            setTotalPages(1);
          }

        } catch (err) {
          console.log("API failed → offline merging mode");
        }
      }

      /* ===============================
         3️⃣ READ TAB CACHE + OFFLINE QUEUE
         =============================== */

      // Read ONLY current tab cache
      const cachedList = (await readCache(TAB_CACHE_KEY)) || [];

      // Offline queued actions
      const offlineQueue = (await readCache("offlineQueue")) || [];

      /* ===============================
         4️⃣ SELECT BASE DATA SOURCE
         =============================== */

      // Online success → API data
      // Offline / API fail → Tab cache
      const baseSource =
        (isConnected && apiSuccess) ? apiData : cachedList;

      // Use Map to safely merge records
      const mergedMap = new Map();

      // Insert base records
      baseSource.forEach(item => {
        const id = String(item.id || item.tempId);
        mergedMap.set(id, {
          ...item,
          pending: false
        });
      });

      /* ===============================
         5️⃣ OFFLINE UPDATE (PUT)
         =============================== */

      offlineQueue.forEach(q => {
        if (
          q.method?.toLowerCase() === "post" &&
          q.endpoint?.includes("my-expenses/update")
        ) {
          const body = q.body;
          const id = String(body.id);

          // Only override when offline
          if (!apiSuccess && mergedMap.has(id)) {

            // Safety: update only if record belongs to this tab
            if (!isDateInRange(body.date, from, to)) return;

            mergedMap.set(id, {
              ...mergedMap.get(id),
              ...body,
              pending: true
            });
          }
        }
      });

      /* ===============================
         6️⃣ OFFLINE ADD (POST)
         =============================== */

      offlineQueue.forEach(q => {
        if (
          q.method?.toLowerCase() === "post" &&
          q.endpoint?.includes("my-expenses/create")
        ) {
          const body = q.body;

          // 🔹 Ensure record belongs to active tab
          const belongsToThisTab = isDateInRange(body.date, from, to);
          if (!belongsToThisTab) return;

          // 🔹 Use tempId or timestamp to uniquely identify offline record
          const tempId = body.tempId || `local_${q.timestamp}`;

          mergedMap.set(String(tempId), {
            ...normalizeExpenseIcons(body),
            id: tempId,
            tempId,
            pending: true, // ✅ ensures top of list & highlighted
          });
        }
      });


      /* ===============================
         7️⃣ FINAL SORT (Pending First)
         =============================== */

      const finalList = Array.from(mergedMap.values()).sort(
        (a, b) =>
          a.pending === b.pending ? 0 : a.pending ? -1 : 1
      );

      // Update UI
      setExpensesReports(finalList);

      /* ===============================
         8️⃣ SAVE TAB CACHE (ONLINE ONLY)
         =============================== */

      if (isConnected && apiSuccess) {
        await storeCache(TAB_CACHE_KEY, apiData);
      }

    } catch (error) {
      console.error("fetchExpenses error:", error);
    } finally {
      setLoading(false);
    }
  };


  // ---------------- FOCUS EFFECT (MyProjects Style) ----------------

  useFocusEffect(
    useCallback(() => {

      const checkActionsAndFetch = async () => {
        try {
          const newRec = await readCache("newRecordAdded");
          const delRec = await readCache("recordDeleted");
          const upRec = await readCache("recordUpdated");

          if (newRec || delRec || upRec) {
            await fetchExpenses(1, order);

            if (newRec) await storeCache("newRecordAdded", false);
            if (delRec) await storeCache("recordDeleted", false);
            if (upRec) await storeCache("recordUpdated", false);

          } else {
            fetchExpenses(page, order);
          }

        } catch (err) {
          console.error("Focus effect error:", err);
        }
      };

      checkActionsAndFetch();

    }, [activeTab, fetchExpense, isConnected, page])
  );



  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh par hum strictly cache bypass karenge
    setOrder("desc")
    await fetchExpenses(1, order);
    setRefreshing(false);
  };


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

    // 🔑 Cache key based on ACTIVE TAB + DATE RANGE
    const TAB_CACHE_KEY = `expenses_${activeTab}_${from}_${to}`;

    // ❌ Delete not allowed in offline mode
    if (!isConnected) {
      showModal("Offline mode — You cannot delete items", "error");
      return;
    }

    setGlobalLoading(true);

    try {
      /* =========================
         1️⃣ API DELETE CALL
      ========================== */
      const res = await del(
        "my-expenses/delete",
        { ids },
        { useBearerAuth: true }
      );

      if (res?.status === "success") {

        /* =========================
           2️⃣ UPDATE UI STATE
           Remove deleted ids
        ========================== */
        const updatedList =
          expensesReports.filter(item => !ids.includes(item.id));

        setExpensesReports(updatedList);

        /* =========================
           3️⃣ UPDATE TAB CACHE ONLY
           (this-week / prev-week etc)
        ========================== */
        await storeCache(TAB_CACHE_KEY, updatedList);

        // 🔔 Flag so focusEffect can refetch if needed
        await storeCache("recordDeleted", true);

        showModal(
          res.data || res.message || `${ids.length} record(s) deleted`,
          "success"
        );

      } else {
        showModal(res?.data || "Failed to delete", "error");
      }

    } catch (err) {
      console.error("Delete error:", err);
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
          else router.push({ pathname: "/otherPages/expenses/addExpenses", params: { id, activeTab, from, to } });
        }}
        activeOpacity={0.8}
        className="mb-4"
      >
        <View
          className={`
            rounded-xl p-4 shadow-sm border flex-row
             ${isSelected ? darkMode ? "border-blue-500" : " border-blue-700 bg-white" :
              item.pending ? darkMode ? 'border-yellow-300' : "border-yellow-400 bg-yellow-50" :
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
                <View className="bg-purple-100 w-9 h-9 rounded-full mr-1 flex-row items-center justify-center">
                  <DynamicIcon
                    type={item.categoryIcon?.type}
                    icon={item.categoryIcon?.icon}
                    size={18}
                    color="#7c3aed"
                    showSpecificIcon="category"
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

            <View className="flex-row justify-between mb-4">
              <View className="flex-row items-center w-[48%]">
                <View className="bg-green-100 w-9 h-9 rounded-full mr-2 flex-row items-center justify-center">
                  <DynamicIcon
                    type={item.paymentIcon?.type}
                    icon={item.paymentIcon?.icon}
                    size={18}
                    color="#15803d"
                    showSpecificIcon="payment"
                    fallbackType="FontAwesome"
                    fallbackName="credit-card"
                  />
                </View>
                <View>
                  <ThemedText className="text-xs text-gray-400">Payment Option</ThemedText>
                  <ThemedText>{item?.payment_option}</ThemedText>
                </View>
              </View>

              <View className="flex-row items-center w-[48%]">
                <View className="bg-orange-100 w-9 h-9 rounded-full mr-2 flex-row items-center justify-center">
                  <DynamicIcon
                    type={item.vendorIcon?.type}
                    icon={item.vendorIcon?.icon}
                    size={18}
                    color="#c2410c"
                    showSpecificIcon="vendor"
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
              <View className="bg-blue-100 w-9 h-9 rounded-full mr-2 flex-row items-center justify-center">
                <DynamicIcon
                  type={item.projectIcon?.type}
                  icon={item.projectIcon?.icon}
                  size={18}
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

            {/* <Image
              source={{ uri: "https://trackingdudes.com/uploads/"+item.receipt }}  // remote URL
              style={{ width: 50, height: 50, resizeMode: "contain" }}
            /> */}

            {item.memo && (
              <View className="mt-3 px-2">
                <ThemedText className="text-sm text-gray-600 mt-1">{item.memo}</ThemedText>
              </View>
            )}

            {item.pending && <Text className="text-yellow-600 mt-3 text-xs font-medium">⏳ Sync pending...</Text>}

          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyList = () => (
    <ThemedView className="rounded-lg mt-2 items-center justify-center py-10 shadow-md">
      <Ionicons name="receipt-outline" size={60} color="#9ca3af" />
      <ThemedText className="mt-4  text-xl font-medium text-gray-400">No expenses listed yet</ThemedText>
      <ThemedText className="text-lg text-gray-400 mt-1">Start by adding your first expenses report</ThemedText>
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

        <AddFilterCard title="Add Expenses" filterItem={() => { }} onchange={() => router.push({
          pathname: "/otherPages/expenses/addExpenses",
          params: { activeTab, from, to }
        })} />

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
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              contentContainerStyle={{ paddingBottom: selectionMode ? 90 : 10 }}
              ListFooterComponent={
                isConnected && totalPages > 1 ? (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={(newPage) => {
                      fetchExpenses(newPage);
                    }}
                  />

                ) : null
              }
            />
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
  icon,
  size = 16,
  showSpecificIcon = "",
  color = "#000",
  fallbackType = "ion",
  fallbackName = "help-circle-outline",
}) => {

  const iconType = (type || "").toLowerCase();

  // ✅ SVG case
  if (iconType === "svg") {
    return (
      <RenderIcon
        icon={`svg:${icon}`}
        size={18}
        color={color}
        type={showSpecificIcon}
      />
    );
  }

  //  Vector icon case
  const IconComponent =
    ICON_MAP[iconType] ||
    ICON_MAP[fallbackType] ||
    Ionicons;

  return (
    <IconComponent
      name={icon || fallbackName}
      size={size}
      color={color}
    />
  );
};


export default Expenses;
