// Green means a recorded purchase. Other saved states remain pending/orange.
export const purchaseTone = (status: string) => status === 'Ordered' ? 'purchase-ordered' : 'purchase-pending';
