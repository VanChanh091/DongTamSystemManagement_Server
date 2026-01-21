import { deliveryRepository } from "../../../repository/deliveryRepository";

export const getDeliveryByDate = async (deliveryDate: Date) => {
  const plans = await deliveryRepository.getAllDeliveryPlanByDate(deliveryDate);

  if (!plans || plans.length === 0) {
    return { message: "get schedule delivery successfully", data: [] };
  }

  //Gom tất cả items từ tất cả plans để thực hiện truy vấn 1 lần
  const plansData = plans.map((p) => p.get({ plain: true })) as any[];
  const allItems = plansData.flatMap((p) => p.DeliveryItems || []);

  const paperIds = allItems
    .filter((i: any) => i.targetType === "paper")
    .map((i: any) => i.targetId);
  const boxIds = allItems.filter((i: any) => i.targetType === "box").map((i: any) => i.targetId);

  // Lấy thông tin Box mapping
  const boxes = boxIds.length > 0 ? await deliveryRepository.getAllBoxByIds(boxIds, true) : [];

  const boxIdToPlanningIdMap: Record<number, number> = Object.fromEntries(
    boxes.map((b) => [b.planningBoxId, b.planningId]),
  );

  // Lấy thông tin chi tiết Paper/Order
  const allPlanningIds = [...paperIds, ...boxes.map((b) => b.planningId).filter((id) => id)];

  const papersData =
    allPlanningIds.length > 0 ? await deliveryRepository.getAllPaperScheduled(allPlanningIds) : [];

  const paperMap = Object.fromEntries(papersData.map((p) => [p.planningId, p]));

  const finalData = plansData.map((plan) => {
    const items = plan.DeliveryItems || [];
    const mappedItems = items.map((item: any) => {
      const targetId =
        item.targetType === "paper" ? item.targetId : boxIdToPlanningIdMap[item.targetId];

      const paperInfo = paperMap[targetId] ? { ...paperMap[targetId] } : null;

      // Loại bỏ các trường không cần thiết để output sạch hơn
      const { targetType, targetId: _tid, ...rest } = item;
      return { ...rest, Planning: paperInfo };
    });

    return { ...plan, DeliveryItems: mappedItems };
  });

  return finalData;
};
