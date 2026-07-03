// DEV ONLY - not used by production room flows.
// Legacy mock floor plan kept only as a visual/reference snapshot.
export const legacyFloorPlans = [
  { floor: "Tầng 1", left: ["P102", "P101"], right: ["P103", "P104", "P105", "P106"] },
  { floor: "Tầng 2", left: ["P202", "P201"], right: ["P203", "P204", "P205", "P206", "P207", "P208"] },
  { floor: "Tầng 3", left: ["P302", "P301"], right: ["P303", "P304", "P305", "P306", "P307", "P308"] },
  { floor: "Tầng 4", left: ["P402", "P401"], right: ["P403", "P404", "P405", "P406", "P407", "P408"] },
  { floor: "Tầng 5", left: ["P502", "P501"], right: ["P503", "P504", "P505", "P506", "P507"] },
];

export const legacyRoomStatusIds = {
  available: ["P101", "P103", "P202", "P203", "P208", "P303", "P308", "P401", "P403", "P408", "P503", "P507"],
  maintenance: ["P204", "P306"],
  premium: ["P101", "P102", "P201", "P202", "P301", "P302", "P401", "P402", "P501", "P502"],
  quiet: ["P103", "P203", "P208", "P303", "P308", "P403", "P408", "P503", "P507"],
};
