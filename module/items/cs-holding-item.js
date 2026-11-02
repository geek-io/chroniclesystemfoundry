import {CSItem} from "./csItem.js";
import SystemUtils from "../utils/systemUtils.js";

export class CSHoldingItem extends CSItem {
    getTotalInvested() {
        let total = SystemUtils.int(this.system.investment);
        for (const feature of SystemUtils.toArray(this.system.features)) total += SystemUtils.int(feature?.cost);
        return total;
    }
}
