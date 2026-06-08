/** EV3 タッチセンサー連携対象（グランフロント駐輪場・最大3台） */
export const EV3_LINKED_PARKING_LOT_ID = 1;
export const EV3_LINKED_PARKING_LOT_NAME = "グランフロント";
export const EV3_TOTAL_SLOTS = 3;
export const EV3_POLL_INTERVAL_MS = 1500;

type Ev3LinkableLot = {
  name: string;
  externalStatusId?: number;
  isEv3Linked?: boolean;
};

/** EV3 連携対象の駐輪場かどうか（DB 取得後も名前で判定） */
export function isEv3LinkedLot(lot: Ev3LinkableLot): boolean {
  return lot.isEv3Linked === true || lot.name === EV3_LINKED_PARKING_LOT_NAME;
}

/** グランフロントに EV3 連携メタデータを付与する */
export function applyEv3LotMetadata<T extends Ev3LinkableLot & { total_spots: number }>(
  lot: T
): T & { externalStatusId?: number; isEv3Linked?: boolean } {
  if (!isEv3LinkedLot(lot)) {
    return lot;
  }
  return {
    ...lot,
    name: EV3_LINKED_PARKING_LOT_NAME,
    total_spots: EV3_TOTAL_SLOTS,
    externalStatusId: EV3_LINKED_PARKING_LOT_ID,
    isEv3Linked: true,
  };
}
