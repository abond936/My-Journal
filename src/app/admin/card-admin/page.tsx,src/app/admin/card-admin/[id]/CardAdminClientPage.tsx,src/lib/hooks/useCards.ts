const handleEditClick = () => {
  sessionStorage.setItem('adminCardListScrollPos', window.scrollY.toString());
  saveStateToSession();
};

const handleSave = async (cardData: Partial<Card>) => {
  try {
    // ... (existing API call logic)
    if (!response.ok) {
      // ... (existing error handling)
    }

    const updatedCard = await response.json();
    sessionStorage.setItem(UPDATED_CARD_KEY, JSON.stringify(updatedCard));

    router.back();
  } catch (error) {
    // ... (existing error handling)
  }
};

useEffect(() => {
  const savedStateJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
  const updatedCardJSON = sessionStorage.getItem(UPDATED_CARD_KEY);

  if (savedStateJSON) {
    // ... (existing logic)
  }
}, [mutate]); 