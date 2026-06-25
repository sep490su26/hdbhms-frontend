"use client";

import { useParams } from "next/navigation";
import { FacilityFloorPlanDesigner } from "../../_components/FacilityFloorPlanDesigner";

export default function FloorPlanDesignerRoute() {
  const params = useParams();
  return <FacilityFloorPlanDesigner propertyId={params.id} />;
}
