export interface OutletVisit {
  id:string; storeId:string; mdeId:string; visitedBy:string; visitedOn:string;
  note:string; createdAt:string; updatedAt:string;
}
export interface OutletCoverage {
  storeId:string; mdeId:string; visitCount:number; lastVisitedOn:string;
}
export interface VisitPeriod {start:string;end:string}
