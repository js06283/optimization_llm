import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = {
  bg: "#f6f8f9",
  panel: "#ffffff",
  border: "#d6dde3",
  text: "#24303b",
  muted: "#6c7a88",
  accent: "#274c57",
  accentSoft: "#e2ecef",
  success: "#4d908e",
  warning: "#f4a261",
  danger: "#c8553d",
  commuter: "#e07a5f",
  worker: "#81b29a",
  athlete: "#6d597a",
  demandHigh: "#d96c5f",
  demandMid: "#5e81ac",
  demandLow: "#8aa189",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const BASELINE_SEED = 42;

const TIMESLOTS = [
  { id: "T1", label: "Mon AM", day: "Mon", block: "AM", early: true, afternoon: false, mwfMorning: true, friday: false, capacity: 2 },
  { id: "T2", label: "Mon PM", day: "Mon", block: "PM", early: false, afternoon: true, mwfMorning: false, friday: false, capacity: 2 },
  { id: "T3", label: "Tue AM", day: "Tue", block: "AM", early: true, afternoon: false, mwfMorning: false, friday: false, capacity: 2 },
  { id: "T4", label: "Tue PM", day: "Tue", block: "PM", early: false, afternoon: true, mwfMorning: false, friday: false, capacity: 2 },
  { id: "T5", label: "Wed AM", day: "Wed", block: "AM", early: true, afternoon: false, mwfMorning: true, friday: false, capacity: 2 },
  { id: "T6", label: "Wed PM", day: "Wed", block: "PM", early: false, afternoon: true, mwfMorning: false, friday: false, capacity: 2 },
  { id: "T7", label: "Thu AM", day: "Thu", block: "AM", early: true, afternoon: false, mwfMorning: false, friday: false, capacity: 2 },
  { id: "T8", label: "Thu PM", day: "Thu", block: "PM", early: false, afternoon: true, mwfMorning: false, friday: false, capacity: 2 },
  { id: "T9", label: "Fri AM", day: "Fri", block: "AM", early: true, afternoon: false, mwfMorning: true, friday: true, capacity: 2 },
  { id: "T10", label: "Fri PM", day: "Fri", block: "PM", early: false, afternoon: true, mwfMorning: false, friday: true, capacity: 2 },
];

const COURSE_DEFS = [
  { id: "C1", name: "Intro Economics", demandByGroup: { commuter: 20, worker: 14, athlete: 0 } },
  { id: "C2", name: "Data Science", demandByGroup: { commuter: 16, worker: 0, athlete: 14 } },
  { id: "C3", name: "Organic Chemistry", demandByGroup: { commuter: 0, worker: 12, athlete: 18 } },
  { id: "C4", name: "Modern Literature", demandByGroup: { commuter: 14, worker: 12, athlete: 0 } },
  { id: "C5", name: "Statistics", demandByGroup: { commuter: 20, worker: 16, athlete: 0 } },
  { id: "C6", name: "Art History", demandByGroup: { commuter: 0, worker: 11, athlete: 16 } },
  { id: "C7", name: "Biology", demandByGroup: { commuter: 12, worker: 0, athlete: 18 } },
  { id: "C8", name: "Macroeconomics", demandByGroup: { commuter: 0, worker: 13, athlete: 11 } },
  { id: "C9", name: "Linear Algebra", demandByGroup: { commuter: 10, worker: 0, athlete: 13 } },
  { id: "C10", name: "Public Policy", demandByGroup: { commuter: 14, worker: 13, athlete: 0 } },
  { id: "C11", name: "Environmental Science", demandByGroup: { commuter: 0, worker: 10, athlete: 17 } },
  { id: "C12", name: "Psychology", demandByGroup: { commuter: 12, worker: 0, athlete: 10 } },
].map((course) => ({
  ...course,
  totalDemand: Object.values(course.demandByGroup).reduce((sum, value) => sum + value, 0),
}));

const GROUPS = {
  commuter: {
    label: "Commuters",
    short: "Commuter",
    icon: "C",
    color: COLORS.commuter,
    count: 45,
    desiredCount: 4,
    eligibleCourses: ["C1", "C2", "C4", "C5", "C7", "C9", "C10", "C12"],
    timeMode: "morning",
    timeSensitivity: 0.4,
    compactDayWeight: 1.15,
    singleBlockWeight: 1.2,
  },
  worker: {
    label: "Working Students",
    short: "Worker",
    icon: "W",
    color: COLORS.worker,
    count: 40,
    desiredCount: 4,
    eligibleCourses: ["C1", "C3", "C4", "C5", "C6", "C8", "C10", "C11"],
    timeMode: "afternoon",
    timeSensitivity: 1,
    compactDayWeight: 0.45,
    singleBlockWeight: 0.65,
  },
  athlete: {
    label: "Student-Athletes",
    short: "Athlete",
    icon: "A",
    color: COLORS.athlete,
    count: 35,
    desiredCount: 4,
    eligibleCourses: ["C2", "C3", "C6", "C7", "C8", "C9", "C11", "C12"],
    timeMode: "mwfMorning",
    timeSensitivity: 1,
    compactDayWeight: 0.35,
    singleBlockWeight: 0.4,
  },
};

const VOICES = [
  {
    id: "voice-commuter",
    group: "commuter",
    title: "Commuter Voice",
    text: "I can handle an early morning if I need to. What really ruins my week is taking one class, waiting around for hours, and then taking another. If I have to come to campus, I want it to feel worth the trip.",
    interpretation:
      "Correct interpretation: this is mainly about compactness and fewer campus days, not about banning mornings. The intended move is to reduce scattered single-block days for commuters.",
  },
  {
    id: "voice-worker",
    group: "worker",
    title: "Working Student Voice",
    text: "Afternoons are when I start work. I can occasionally make one late class work, but if several of my courses land after lunch the schedule just collapses for me.",
    interpretation:
      "Correct interpretation: afternoon classes are genuinely costly for workers. This is the strongest direct time-of-day signal in the simplified experiment.",
  },
  {
    id: "voice-athlete",
    group: "athlete",
    title: "Athlete Voice",
    text: "The hard mornings are Monday, Wednesday, and Friday because of practice. Tuesday and Thursday mornings are fine. If a class is at 9am on practice days, that's the real problem.",
    interpretation:
      "Correct interpretation: athlete aversion is MWF-specific. The point is not 'athletes dislike mornings' in general; the point is to discover and use the narrower restriction.",
  },
];

const BRIEFINGS = [
  {
    id: "briefing-chair",
    title: "Department Chair",
    role: "Coverage",
    text: "Students need to be able to take the courses they want. If popular courses collide, everything else is secondary.",
    interpretation:
      "Correct interpretation: coverage is the baseline objective. The workbench should make popular-course conflicts visible, because they drive a large share of welfare.",
  },
  {
    id: "briefing-gov",
    title: "Student Government",
    role: "Equity",
    text: "Commuters and working students have the least slack in the system. A schedule that works only for flexible students is not a good schedule.",
    interpretation:
      "Correct interpretation: subgroup averages matter. You are supposed to look at who is carrying the harm, not just the aggregate score.",
  },
  {
    id: "briefing-advisor",
    title: "Faculty Advisor",
    role: "Diagnosis",
    text: "When students complain, it is usually because their week feels fragmented. A timetable can look acceptable overall while still producing miserable schedules for one group.",
    interpretation:
      "Correct interpretation: use subgroup metrics to diagnose hidden failure modes. This is the simplified diagnosis cue from the writeup.",
  },
];

const TRUE_WEIGHTS = {
  coverage: 10,
  timePenalty: 2,
  compactnessPenalty: 2.5,
  fridayBonus: 1,
};

const DEFAULT_WEIGHTS = {
  coverage: 10,
  timePenalty: 2,
  compactnessPenalty: 2.5,
  fridayBonus: 0,
};

const DEFAULT_CONSTRAINTS = {
  noAthleteMwfMorning: false,
  preferFridayFree: false,
};
const PRECOMPUTED_OPTIMAL_ASSIGNMENT = {
  C1: "T5",
  C2: "T7",
  C3: "T4",
  C4: "T5",
  C5: "T6",
  C6: "T3",
  C7: "T7",
  C8: "T3",
  C9: "T8",
  C10: "T6",
  C11: "T4",
  C12: "T8",
};

const COURSE_MAP = Object.fromEntries(COURSE_DEFS.map((course) => [course.id, course]));
const SLOT_MAP = Object.fromEntries(TIMESLOTS.map((slot) => [slot.id, slot]));

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function sampleWithoutReplacement(values, count, rng) {
  const pool = [...values];
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]];
  }
  return pool.slice(0, count);
}

function panelStyle(extra = {}) {
  return {
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    boxShadow: "0 14px 34px rgba(31, 41, 55, 0.05)",
    ...extra,
  };
}

function formatNumber(value, digits = 1) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value);
}

function getDemandColor(totalDemand) {
  if (totalDemand >= 32) return COLORS.demandHigh;
  if (totalDemand >= 24) return COLORS.demandMid;
  return COLORS.demandLow;
}

function createEmptyAssignment() {
  return Object.fromEntries(COURSE_DEFS.map((course) => [course.id, null]));
}

function buildCoursesBySlot(assignment) {
  const bySlot = Object.fromEntries(TIMESLOTS.map((slot) => [slot.id, []]));
  const unassigned = [];

  COURSE_DEFS.forEach((course) => {
    const slotId = assignment[course.id];
    if (slotId && bySlot[slotId]) {
      bySlot[slotId].push(course);
    } else {
      unassigned.push(course);
    }
  });

  Object.values(bySlot).forEach((courses) => {
    courses.sort((left, right) => right.totalDemand - left.totalDemand);
  });

  return { bySlot, unassigned };
}

function getSlotLoads(assignment) {
  const loads = Object.fromEntries(TIMESLOTS.map((slot) => [slot.id, 0]));
  Object.values(assignment).forEach((slotId) => {
    if (slotId) loads[slotId] += 1;
  });
  return loads;
}

function generateStudents(seed = BASELINE_SEED) {
  const rng = createRng(seed);
  const students = [];
  let sequence = 1;

  Object.entries(GROUPS).forEach(([group, config]) => {
    for (let index = 0; index < config.count; index += 1) {
      students.push({
        id: `S${String(sequence).padStart(3, "0")}`,
        group,
        desiredCourses: sampleWithoutReplacement(config.eligibleCourses, config.desiredCount, rng),
      });
      sequence += 1;
    }
  });

  return students;
}

function computeStudentOutcome(student, assignment) {
  const config = GROUPS[student.group];
  const desiredPlacements = student.desiredCourses
    .map((courseId, order) => ({
      courseId,
      order,
      slotId: assignment[courseId],
      slot: assignment[courseId] ? SLOT_MAP[assignment[courseId]] : null,
    }))
    .filter((item) => item.slot);

  const uniqueSlots = new Set(desiredPlacements.map((item) => item.slotId));
  const coverage = uniqueSlots.size / student.desiredCourses.length;

  let timePenalty = 0;
  desiredPlacements.forEach((item) => {
    if (config.timeMode === "morning" && item.slot.early) timePenalty += config.timeSensitivity;
    if (config.timeMode === "afternoon" && item.slot.afternoon) timePenalty += config.timeSensitivity;
    if (config.timeMode === "mwfMorning" && item.slot.mwfMorning) timePenalty += config.timeSensitivity;
  });

  const countsByDay = Object.fromEntries(DAYS.map((day) => [day, 0]));
  const blocksByDay = Object.fromEntries(DAYS.map((day) => [day, new Set()]));
  desiredPlacements.forEach((item) => {
    countsByDay[item.slot.day] += 1;
    blocksByDay[item.slot.day].add(item.slot.block);
  });

  const daysWithClasses = DAYS.filter((day) => countsByDay[day] > 0).length;
  const singleBlockDays = DAYS.filter((day) => blocksByDay[day].size === 1).length;
  const compactnessPenalty =
    config.compactDayWeight * daysWithClasses + config.singleBlockWeight * singleBlockDays;
  const fridayBonus = countsByDay.Fri === 0 ? 1 : 0;

  return {
    coverage,
    timePenalty,
    compactnessPenalty,
    fridayBonus,
    daysWithClasses,
    singleBlockDays,
    hasFridayClasses: countsByDay.Fri > 0,
  };
}

function computeConstraintViolations(assignment, metrics, constraints) {
  const violations = [];
  const loads = getSlotLoads(assignment);

  Object.entries(loads).forEach(([slotId, load]) => {
    if (load > SLOT_MAP[slotId].capacity) {
      violations.push(`Capacity exceeded in ${SLOT_MAP[slotId].label}`);
    }
  });

  if (constraints.noAthleteMwfMorning) {
    const blocked = COURSE_DEFS.filter(
      (course) => course.demandByGroup.athlete > 0 && SLOT_MAP[assignment[course.id]]?.mwfMorning
    );
    if (blocked.length > 0) violations.push("Athlete-demanded courses placed in MWF mornings");
  }

  if (constraints.preferFridayFree) {
    if (metrics.fridayFreeRate < 0.55) {
      violations.push("Friday-free rate is below the experiment target");
    }
  }

  return violations;
}

function evaluateAssignment(assignment, students, weights, constraints) {
  const componentTotals = {
    coverage: 0,
    timePenalty: 0,
    compactnessPenalty: 0,
    fridayBonus: 0,
  };

  const perGroup = Object.fromEntries(
    Object.keys(GROUPS).map((group) => [
      group,
      {
        group,
        label: GROUPS[group].label,
        color: GROUPS[group].color,
        count: 0,
        totalUtility: 0,
        fullCoverage: 0,
        avgDays: 0,
        avgSingleBlockDays: 0,
      },
    ])
  );

  const studentRows = students.map((student) => {
    const outcome = computeStudentOutcome(student, assignment);
    const utility =
      TRUE_WEIGHTS.coverage * outcome.coverage -
      TRUE_WEIGHTS.timePenalty * outcome.timePenalty -
      TRUE_WEIGHTS.compactnessPenalty * outcome.compactnessPenalty +
      TRUE_WEIGHTS.fridayBonus * outcome.fridayBonus;

    componentTotals.coverage += outcome.coverage;
    componentTotals.timePenalty += outcome.timePenalty;
    componentTotals.compactnessPenalty += outcome.compactnessPenalty;
    componentTotals.fridayBonus += outcome.fridayBonus;

    const bucket = perGroup[student.group];
    bucket.count += 1;
    bucket.totalUtility += utility;
    bucket.avgDays += outcome.daysWithClasses;
    bucket.avgSingleBlockDays += outcome.singleBlockDays;
    if (outcome.coverage === 1) bucket.fullCoverage += 1;

    return { ...outcome, id: student.id, group: student.group, utility };
  });

  Object.values(perGroup).forEach((bucket) => {
    if (bucket.count === 0) return;
    bucket.avgDays /= bucket.count;
    bucket.avgSingleBlockDays /= bucket.count;
    bucket.avgUtility = bucket.totalUtility / bucket.count;
    bucket.fullCoverageRate = bucket.fullCoverage / bucket.count;
  });

  const surrogateScore =
    weights.coverage * componentTotals.coverage -
    weights.timePenalty * componentTotals.timePenalty -
    weights.compactnessPenalty * componentTotals.compactnessPenalty +
    weights.fridayBonus * componentTotals.fridayBonus;

  const trueScore =
    TRUE_WEIGHTS.coverage * componentTotals.coverage -
    TRUE_WEIGHTS.timePenalty * componentTotals.timePenalty -
    TRUE_WEIGHTS.compactnessPenalty * componentTotals.compactnessPenalty +
    TRUE_WEIGHTS.fridayBonus * componentTotals.fridayBonus;

  const courseConflictCount = COURSE_DEFS.filter((course) => {
    const slotId = assignment[course.id];
    if (!slotId) return false;
    return COURSE_DEFS.some(
      (other) =>
        other.id !== course.id &&
        assignment[other.id] === slotId &&
        (course.demandByGroup.commuter > 0 && other.demandByGroup.commuter > 0 ||
          course.demandByGroup.worker > 0 && other.demandByGroup.worker > 0 ||
          course.demandByGroup.athlete > 0 && other.demandByGroup.athlete > 0)
    );
  }).length;

  const overallCoverage = studentRows.filter((row) => row.coverage === 1).length / studentRows.length;
  const fridayFreeRate = studentRows.filter((row) => !row.hasFridayClasses).length / studentRows.length;
  const commuterFragmentation = perGroup.commuter?.avgSingleBlockDays ?? 0;

  const metrics = {
    trueScore,
    surrogateScore,
    components: componentTotals,
    perGroup,
    overallCoverage,
    fridayFreeRate,
    commuterFragmentation,
    courseConflictCount,
    studentRows,
  };

  const violations = computeConstraintViolations(assignment, metrics, constraints);
  return {
    ...metrics,
    violations,
    penalizedSurrogate: surrogateScore - violations.length * 100000,
  };
}

function solveTimetable({ students, weights, constraints, seed, restarts, iterations }) {
  let bestAssignment = null;
  let bestMetrics = null;

  for (let restart = 0; restart < restarts; restart += 1) {
    const rng = createRng(seed + restart * 997);
    const assignment = createEmptyAssignment();
    const loads = getSlotLoads(assignment);
    const orderedCourses = [...COURSE_DEFS].sort((left, right) => {
      const demandDelta = right.totalDemand - left.totalDemand;
      if (demandDelta !== 0) return demandDelta;
      return rng() > 0.5 ? 1 : -1;
    });

    orderedCourses.forEach((course) => {
      let bestSlot = null;
      let bestScore = -Infinity;

      TIMESLOTS.forEach((slot) => {
        if (loads[slot.id] >= slot.capacity) return;
        const trial = { ...assignment, [course.id]: slot.id };
        const score = evaluateAssignment(trial, students, weights, constraints).penalizedSurrogate;
        if (score > bestScore) {
          bestScore = score;
          bestSlot = slot.id;
        }
      });

      assignment[course.id] = bestSlot;
      if (bestSlot) loads[bestSlot] += 1;
    });

    let currentMetrics = evaluateAssignment(assignment, students, weights, constraints);
    let currentScore = currentMetrics.penalizedSurrogate;

    for (let step = 0; step < iterations; step += 1) {
      const next = { ...assignment };
      const first = COURSE_DEFS[Math.floor(rng() * COURSE_DEFS.length)];

      if (rng() < 0.6) {
        const nextSlot = TIMESLOTS[Math.floor(rng() * TIMESLOTS.length)];
        const slotLoads = getSlotLoads(next);
        if (next[first.id] === nextSlot.id || slotLoads[nextSlot.id] >= nextSlot.capacity) continue;
        next[first.id] = nextSlot.id;
      } else {
        const second = COURSE_DEFS[Math.floor(rng() * COURSE_DEFS.length)];
        if (second.id === first.id) continue;
        [next[first.id], next[second.id]] = [next[second.id], next[first.id]];
      }

      const nextMetrics = evaluateAssignment(next, students, weights, constraints);
      if (nextMetrics.penalizedSurrogate > currentScore || rng() < 0.015) {
        Object.assign(assignment, next);
        currentMetrics = nextMetrics;
        currentScore = nextMetrics.penalizedSurrogate;
      }
    }

    if (!bestMetrics || currentMetrics.penalizedSurrogate > bestMetrics.penalizedSurrogate) {
      bestAssignment = { ...assignment };
      bestMetrics = currentMetrics;
    }
  }

  if (!bestAssignment || !bestMetrics) {
    const fallbackAssignment = createEmptyAssignment();
    return {
      assignment: fallbackAssignment,
      metrics: evaluateAssignment(fallbackAssignment, students, weights, constraints),
    };
  }

  return { assignment: bestAssignment, metrics: bestMetrics };
}

function SectionCard({ title, action, children, style }) {
  return (
    <section style={panelStyle({ padding: 14, display: "grid", gap: 10, ...style })}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {title}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function CourseChip({ course, dragging = false }) {
  const draggable = useDraggable({
    id: course.id,
    data: { type: "course", courseId: course.id },
  });

  return (
    <div
      ref={draggable.setNodeRef}
      {...draggable.attributes}
      {...draggable.listeners}
      style={{
        transform: CSS.Translate.toString(draggable.transform),
        transition: draggable.transition,
        opacity: dragging || draggable.isDragging ? 0.45 : 1,
        cursor: "grab",
        userSelect: "none",
        touchAction: "none",
        padding: "8px 10px",
        borderRadius: 12,
        border: `1px solid ${getDemandColor(course.totalDemand)}`,
        background: `${getDemandColor(course.totalDemand)}18`,
        display: "grid",
        gap: 2,
        fontSize: 11,
        lineHeight: 1.25,
        position: "relative",
      }}
      className="course-chip"
    >
      <strong>{course.id}</strong>
      <span>{course.name}</span>
      <span style={{ color: COLORS.muted }}>Demand {course.totalDemand}</span>
      <div className="course-chip-tooltip">
        <div><strong>{course.id}</strong> demand</div>
        <div>Commuters: {course.demandByGroup.commuter}</div>
        <div>Workers: {course.demandByGroup.worker}</div>
        <div>Athletes: {course.demandByGroup.athlete}</div>
      </div>
    </div>
  );
}

function DropZone({ id, title, subtitle, courses, load, activeCourseId, isHolding = false }) {
  const droppable = useDroppable({ id });
  const isFull = !isHolding && load >= SLOT_MAP[id]?.capacity;

  return (
    <div
      ref={droppable.setNodeRef}
      style={{
        minHeight: isHolding ? 118 : 174,
        borderRadius: 16,
        border: `1px solid ${
          droppable.isOver ? (isFull ? COLORS.danger : COLORS.accent) : isFull ? COLORS.warning : COLORS.border
        }`,
        background: droppable.isOver ? (isFull ? "#fff2ef" : "#eef5f6") : "#fff",
        padding: 12,
        display: "grid",
        alignContent: "start",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
          {subtitle ? <div style={{ color: COLORS.muted, fontSize: 11 }}>{subtitle}</div> : null}
        </div>
        {!isHolding ? <div style={{ color: isFull ? COLORS.warning : COLORS.muted, fontSize: 11 }}>{load}/2</div> : null}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {courses.map((course) => (
          <CourseChip key={course.id} course={course} dragging={activeCourseId === course.id} />
        ))}
        {courses.length === 0 ? (
          <div style={{ color: COLORS.muted, fontSize: 11 }}>{isHolding ? "All courses scheduled." : "Drop courses here"}</div>
        ) : null}
      </div>
    </div>
  );
}

function TimetableWorkbench() {
  const [round, setRound] = useState(1);
  const [studentSeed] = useState(BASELINE_SEED);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [constraints, setConstraints] = useState({ ...DEFAULT_CONSTRAINTS });
  const [assignment, setAssignment] = useState(createEmptyAssignment);
  const [solverSeed, setSolverSeed] = useState(101);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [toast, setToast] = useState("");
  const [showUtilityModal, setShowUtilityModal] = useState(false);
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [showSolverModal, setShowSolverModal] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [solveSummary, setSolveSummary] = useState("No solve run yet.");
  const [gridVersion, setGridVersion] = useState(0);
  const [gridPulse, setGridPulse] = useState(false);

  const students = useMemo(() => generateStudents(studentSeed), [studentSeed]);
  const optimalMetrics = useMemo(
    () => evaluateAssignment(PRECOMPUTED_OPTIMAL_ASSIGNMENT, students, TRUE_WEIGHTS, DEFAULT_CONSTRAINTS),
    [students]
  );
  const currentMetrics = useMemo(
    () => evaluateAssignment(assignment, students, weights, constraints),
    [assignment, students, weights, constraints]
  );

  const percentOfReference =
    optimalMetrics.trueScore === 0 ? 0 : (currentMetrics.trueScore / optimalMetrics.trueScore) * 100;
  const referenceGap =
    optimalMetrics.trueScore === 0
      ? 0
      : ((optimalMetrics.trueScore - currentMetrics.trueScore) / optimalMetrics.trueScore) * 100;

  const courseLayout = useMemo(() => buildCoursesBySlot(assignment), [assignment]);
  const slotLoads = getSlotLoads(assignment);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const activeCourse = activeCourseId ? COURSE_MAP[activeCourseId] : null;

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!gridPulse) return undefined;
    const timer = window.setTimeout(() => setGridPulse(false), 700);
    return () => window.clearTimeout(timer);
  }, [gridPulse]);

  function updateWeight(key, value) {
    setWeights((current) => ({ ...current, [key]: Number(value) }));
  }

  function updateConstraint(key, value) {
    setConstraints((current) => ({ ...current, [key]: value }));
  }

  function applySolvedAssignment(nextAssignment) {
    setAssignment({ ...nextAssignment });
    setGridVersion((current) => current + 1);
    setGridPulse(true);
  }

  function handleSolve(seed = solverSeed, randomize = false) {
    if (isSolving) return;
    setIsSolving(true);
    setSolveSummary("Searching for a timetable...");

    window.setTimeout(() => {
      const result = solveTimetable({
        students,
        weights,
        constraints,
        seed,
        restarts: 10,
        iterations: 5000,
      });

      applySolvedAssignment(result.assignment);

      if (result.metrics.violations.length > 0) {
        setSolveSummary(
          `No fully feasible timetable found. Loaded the best effort with ${result.metrics.violations.length} warning${result.metrics.violations.length === 1 ? "" : "s"}.`
        );
        setToast("Best-effort solve loaded. Active warnings remain.");
      } else {
        setSolveSummary("Feasible timetable found and loaded.");
        setToast("Solved.");
      }

      if (randomize) setSolverSeed((current) => current + 17);
      setIsSolving(false);
    }, 40);
  }

  function handleLoadOptimal() {
    if (isSolving) return;
    applySolvedAssignment(PRECOMPUTED_OPTIMAL_ASSIGNMENT);
    setWeights({ ...TRUE_WEIGHTS });
    setConstraints({ ...DEFAULT_CONSTRAINTS });
    setSolveSummary("Loaded the saved reference timetable.");
    setToast(`Loaded saved reference (F_ref = ${formatNumber(optimalMetrics.trueScore)})`);
  }

  function handleReset() {
    setAssignment(createEmptyAssignment());
    setGridVersion((current) => current + 1);
    setWeights(DEFAULT_WEIGHTS);
    setConstraints({ ...DEFAULT_CONSTRAINTS });
    setRound(1);
    setSolveSummary("No solve run yet.");
    setToast("Reset to empty schedule.");
  }

  function handleDragStart(event) {
    setActiveCourseId(event.active.id);
  }

  function handleDragEnd(event) {
    setActiveCourseId(null);
    const courseId = event.active?.id;
    const targetId = event.over?.id;
    if (!courseId || !targetId) return;

    if (targetId === "holding") {
      setAssignment((current) => ({ ...current, [courseId]: null }));
      return;
    }

    const targetSlot = SLOT_MAP[targetId];
    if (!targetSlot) return;
    const load = slotLoads[targetId];
    if (assignment[courseId] !== targetId && load >= targetSlot.capacity) {
      setToast(`${targetSlot.label} is full.`);
      return;
    }

    setAssignment((current) => ({ ...current, [courseId]: targetId }));
  }

  const subgroupBars = Object.values(currentMetrics.perGroup).map((entry) => ({
    name: entry.label,
    value: entry.avgUtility,
    color: entry.color,
  }));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f1f5f6 0%, #f6f8f9 55%, #edf2f4 100%)",
        color: COLORS.text,
        padding: 16,
      }}
    >
      <div style={{ display: "grid", gap: 14, maxWidth: 1660, minWidth: 1540, margin: "0 auto" }}>
        <header
          style={panelStyle({
            padding: 16,
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          })}
        >
          <div>
            <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Simplified Workbench
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: 28 }}>Timetable Experiment Workbench</h1>
            <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>
              Grounded in the writeup, simplified to interpretation, prioritization, diagnosis, and one hidden discovery.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 12, background: COLORS.accentSoft }}>
              <span style={{ fontSize: 12, color: COLORS.muted }}>Round</span>
              <button className="app-button ghost" onClick={() => setRound((value) => Math.max(1, value - 1))}>-</button>
              <strong>{round}</strong>
              <button className="app-button ghost" onClick={() => setRound((value) => value + 1)}>+</button>
            </div>
            <button className="app-button secondary" onClick={() => setShowUtilityModal(true)}>
              Show True Utility
            </button>
            <button className="app-button secondary" onClick={() => setShowDesignModal(true)}>
              Design Intent
            </button>
            <button className="app-button secondary" onClick={() => setShowSolverModal(true)}>
              How Solver Works
            </button>
            <button className="app-button secondary" onClick={handleReset}>
              Reset
            </button>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "290px minmax(820px, 1fr) 520px", gap: 14, alignItems: "stretch" }}>
          <aside style={{ display: "grid", gap: 14, height: "calc(100vh - 210px)", overflow: "auto", alignContent: "start", paddingRight: 2 }}>
            <SectionCard title="Student Voices">
              {VOICES.map((voice) => (
                <div
                  key={voice.id}
                  style={{
                    borderLeft: `4px solid ${GROUPS[voice.group].color}`,
                    borderRadius: 12,
                    background: "#fbfcfd",
                    padding: 12,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        display: "inline-flex",
                        justifyContent: "center",
                        alignItems: "center",
                        color: "#fff",
                        background: GROUPS[voice.group].color,
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    >
                      {GROUPS[voice.group].icon}
                    </span>
                    <strong style={{ fontSize: 12 }}>{voice.title}</strong>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.45 }}>{voice.text}</div>
                </div>
              ))}
            </SectionCard>

            <SectionCard title="Stakeholder Briefings">
              {BRIEFINGS.map((briefing) => (
                <div key={briefing.id} style={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: 12, display: "grid", gap: 8 }}>
                  <div>
                    <strong style={{ fontSize: 12 }}>{briefing.title}</strong>
                    <div style={{ color: COLORS.muted, fontSize: 11 }}>{briefing.role}</div>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.45 }}>{briefing.text}</div>
                </div>
              ))}
            </SectionCard>
          </aside>

          <main style={{ display: "grid", gap: 14 }}>
            <DndContext
              key={gridVersion}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <section
                className={gridPulse ? "grid-pulse" : ""}
                style={panelStyle({ padding: 16, display: "grid", gap: 14 })}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Timetable Grid
                    </div>
                    <div style={{ fontSize: 13 }}>Start empty, drag manually, or solve from the right panel.</div>
                  </div>
                  <div style={{ fontSize: 12, color: currentMetrics.violations.length ? COLORS.danger : COLORS.success }}>
                    {currentMetrics.violations.length ? `${currentMetrics.violations.length} active warnings` : "No active warnings"}
                  </div>
                </div>

                {isSolving ? (
                  <div
                    style={{
                      borderRadius: 12,
                      background: "#eef5f6",
                      border: `1px solid ${COLORS.border}`,
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                    }}
                  >
                    <div className="solver-spinner" />
                    <span>Solver is searching. The best assignment found will be loaded directly into this grid.</span>
                  </div>
                ) : null}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(150px, 1fr))", gap: 12 }}>
                  {DAYS.map((day, index) => (
                    <div key={day} style={{ display: "grid", gap: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                        {day}
                      </div>
                      {["AM", "PM"].map((block) => {
                        const slot = TIMESLOTS[index * 2 + (block === "AM" ? 0 : 1)];
                        return (
                          <DropZone
                            key={slot.id}
                            id={slot.id}
                            title={slot.label}
                            subtitle={block === "AM" ? "Morning" : "Afternoon"}
                            courses={courseLayout.bySlot[slot.id]}
                            load={slotLoads[slot.id]}
                            activeCourseId={activeCourseId}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>

                <DropZone
                  id="holding"
                  title="Unassigned Courses"
                  subtitle="Drag into the grid"
                  courses={courseLayout.unassigned}
                  load={courseLayout.unassigned.length}
                  activeCourseId={activeCourseId}
                  isHolding
                />
              </section>
              <DragOverlay>{activeCourse ? <CourseChip course={activeCourse} dragging /> : null}</DragOverlay>
            </DndContext>
          </main>

          <aside style={{ display: "grid", height: "calc(100vh - 210px)", overflow: "auto", alignContent: "start", paddingRight: 2 }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 220px", gap: 14, alignItems: "start" }}>
              <SectionCard title="Metrics">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={panelStyle({ padding: 12 })}>
                    <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Current F(x)</div>
                    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{formatNumber(currentMetrics.trueScore)}</div>
                  </div>
                  <div style={panelStyle({ padding: 12, borderColor: COLORS.success })}>
                    <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>% of Reference</div>
                    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{formatNumber(percentOfReference)}%</div>
                  </div>
                </div>

                <div style={{ height: 170 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Average Utility by Group</div>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subgroupBars} layout="vertical" margin={{ left: 0, right: 10, top: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#edf0f2" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {subgroupBars.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Coverage</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>Overall full coverage</span>
                    <strong>{formatNumber(currentMetrics.overallCoverage * 100)}%</strong>
                  </div>
                  {Object.values(currentMetrics.perGroup).map((entry) => (
                    <div key={entry.group} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span>{entry.label}</span>
                      <span>{formatNumber(entry.fullCoverageRate * 100)}%</span>
                    </div>
                  ))}
                </div>

                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>Diagnosis Summary</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>Popular-course conflicts</span>
                    <span>{currentMetrics.courseConflictCount}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>Friday-free rate</span>
                    <span>{formatNumber(currentMetrics.fridayFreeRate * 100)}%</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>Commuter fragmentation</span>
                    <span>{formatNumber(currentMetrics.commuterFragmentation, 2)} single-block days</span>
                  </div>
                </div>

              </SectionCard>

              <SectionCard title="Solver">
                <button className="app-button primary" onClick={() => handleSolve(solverSeed, false)} disabled={isSolving}>
                  {isSolving ? "Solving..." : "Solve"}
                </button>
                <button className="app-button secondary" onClick={() => handleSolve(solverSeed + 31, true)} disabled={isSolving}>
                  {isSolving ? "Working..." : "Re-solve"}
                </button>
                <button className="app-button secondary" onClick={handleLoadOptimal} disabled={isSolving}>
                  Load Saved Reference
                </button>

                <div style={panelStyle({ padding: 10, background: "#fbfcfd" })}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div className={isSolving ? "solver-spinner" : "solver-spinner idle"} />
                    <strong style={{ fontSize: 12 }}>{isSolving ? "Solver running" : "Solver status"}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.45 }}>{solveSummary}</div>
                </div>

                {[
                  ["coverage", "coverage"],
                  ["timePenalty", "time penalty"],
                  ["compactnessPenalty", "compactness"],
                  ["fridayBonus", "friday bonus"],
                ].map(([key, label]) => (
                  <label key={key} style={{ display: "grid", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span>{label}</span>
                      <strong>{weights[key]}</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="12"
                      step="0.5"
                      value={weights[key]}
                      onChange={(event) => updateWeight(key, event.target.value)}
                    />
                  </label>
                ))}

                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Simple Constraints</div>

                <label className="check-row compact">
                  <input
                    type="checkbox"
                    checked={constraints.noAthleteMwfMorning}
                    onChange={(event) => updateConstraint("noAthleteMwfMorning", event.target.checked)}
                  />
                  <span>No MWF morning courses with athlete demand</span>
                </label>

                <label className="check-row compact">
                  <input
                    type="checkbox"
                    checked={constraints.preferFridayFree}
                    onChange={(event) => updateConstraint("preferFridayFree", event.target.checked)}
                  />
                  <span>Favor Friday-free schedules</span>
                </label>

                <div style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.45 }}>
                  This simplified version keeps only the controls that map cleanly onto the writeup: coverage, time, compactness, and a hidden Friday preference.
                </div>

                {currentMetrics.violations.length ? (
                  <div style={{ display: "grid", gap: 6, fontSize: 11, color: COLORS.danger }}>
                    {currentMetrics.violations.map((warning) => (
                      <div key={warning}>• {warning}</div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: COLORS.success }}>No active constraint violations.</div>
                )}
              </SectionCard>
            </div>
          </aside>
        </div>

        <footer
          style={panelStyle({
            padding: "12px 16px",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            fontSize: 13,
          })}
        >
          <span>Current F(x) = {formatNumber(currentMetrics.trueScore)}</span>
          <span>Reference F(x_ref) = {formatNumber(optimalMetrics.trueScore)}</span>
          <span>Gap to reference = {formatNumber(referenceGap)}%</span>
          <span>Round {round}</span>
        </footer>
      </div>

      {toast ? (
        <div
          style={{
            position: "fixed",
            top: 18,
            right: 18,
            background: COLORS.accent,
            color: "#fff",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 12,
            boxShadow: "0 14px 30px rgba(39, 76, 87, 0.24)",
          }}
        >
          {toast}
        </div>
      ) : null}

      {showUtilityModal ? (
        <div
          onClick={() => setShowUtilityModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(18, 25, 32, 0.42)",
            display: "grid",
            placeItems: "center",
            padding: 18,
            zIndex: 10,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={panelStyle({
              width: "min(880px, 100%)",
              maxHeight: "85vh",
              overflow: "auto",
              padding: 18,
              display: "grid",
              gap: 14,
            })}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div>
                <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Hidden Objective
                </div>
                <h2 style={{ margin: "4px 0 0", fontSize: 24 }}>Simplified True Utility</h2>
              </div>
              <button className="app-button secondary" onClick={() => setShowUtilityModal(false)}>
                Close
              </button>
            </div>

            <div style={panelStyle({ padding: 14, background: "#fbfcfd" })}>
              <code style={{ fontSize: 13 }}>
                U_s(x) = 10 * coverage - 2 * time_penalty - 2.5 * compactness_penalty + 1 * friday_bonus
              </code>
              <div style={{ marginTop: 10 }}>
                <code style={{ fontSize: 13 }}>F(x) = \u2211_s U_s(x)</code>
              </div>
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.55 }}>
              This simplified prototype keeps the writeup's core logic. Coverage captures conflict management, time penalties capture direct stakeholder interpretation, compactness captures commuter fragmentation and campus-day burden, and the hidden Friday bonus remains the main discovery element.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 14 }}>
              <div style={panelStyle({ padding: 12 })}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>True Group Mix</div>
                {Object.entries(GROUPS).map(([group, config]) => {
                  const total = Object.values(GROUPS).reduce((sum, entry) => sum + entry.count, 0);
                  return (
                    <div key={group} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                      <span>{config.label}</span>
                      <span>
                        {config.count} students ({formatNumber((config.count / total) * 100)}%)
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={panelStyle({ padding: 12 })}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>True Group Parameters</div>
                {Object.entries(GROUPS).map(([group, config]) => (
                  <div key={group} style={{ fontSize: 11, marginBottom: 8, lineHeight: 1.45 }}>
                    <strong>{config.label}</strong>: time penalty on <code>{config.timeMode}</code>, time sensitivity {config.timeSensitivity}, compact day weight {config.compactDayWeight}, single-block-day weight {config.singleBlockWeight}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={panelStyle({ padding: 12 })}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Current Breakdown</div>
                {Object.entries(currentMetrics.components).map(([key, value]) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span>{key}</span>
                    <span>{formatNumber(value)}</span>
                  </div>
                ))}
              </div>
              <div style={panelStyle({ padding: 12 })}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Saved Reference Breakdown</div>
                {Object.entries(optimalMetrics.components).map(([key, value]) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span>{key}</span>
                    <span>{formatNumber(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showDesignModal ? (
        <div
          onClick={() => setShowDesignModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(18, 25, 32, 0.42)",
            display: "grid",
            placeItems: "center",
            padding: 18,
            zIndex: 10,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={panelStyle({
              width: "min(900px, 100%)",
              maxHeight: "85vh",
              overflow: "auto",
              padding: 18,
              display: "grid",
              gap: 14,
            })}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div>
                <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Experiment Design
                </div>
                <h2 style={{ margin: "4px 0 0", fontSize: 24 }}>How This Design Maps to the Four Dimensions</h2>
              </div>
              <button className="app-button secondary" onClick={() => setShowDesignModal(false)}>
                Close
              </button>
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              This prototype is a simplified version of the writeup's timetabling experiment. The goal is to preserve the four cognitive dimensions while reducing the number of groups, controls, and metrics so the workbench is easier to use and debug.
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}>
                <strong style={{ fontSize: 12 }}>Interpretation</strong>
                <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                  The student voices use ordinary language rather than parameter names. Commuters imply compact schedules, workers imply strong afternoon aversion, and athletes imply a narrow MWF-morning issue. The participant has to translate those statements into model changes.
                </div>
              </div>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}>
                <strong style={{ fontSize: 12 }}>Prioritization</strong>
                <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                  The stakeholder briefings intentionally emphasize different values: coverage, equity, and humane schedules. No single stakeholder gives the whole answer, so participants must decide how to balance competing concerns.
                </div>
              </div>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}>
                <strong style={{ fontSize: 12 }}>Diagnosis</strong>
                <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                  The metrics are chosen to support diagnosis rather than to reveal the objective directly. Coverage, subgroup utility, conflict count, Friday-free rate, and commuter fragmentation help explain why a timetable underperforms and which group is being harmed.
                </div>
              </div>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}>
                <strong style={{ fontSize: 12 }}>Discovery</strong>
                <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                  The hidden structure is lighter than in the full writeup but still deliberate. The true objective rewards Friday-free schedules, and athlete preferences are narrower than a simple “no mornings” rule. Participants should only uncover those through experimentation and comparison.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showSolverModal ? (
        <div
          onClick={() => setShowSolverModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(18, 25, 32, 0.42)",
            display: "grid",
            placeItems: "center",
            padding: 18,
            zIndex: 10,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={panelStyle({
              width: "min(860px, 100%)",
              maxHeight: "85vh",
              overflow: "auto",
              padding: 18,
              display: "grid",
              gap: 14,
            })}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div>
                <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Solver Notes
                </div>
                <h2 style={{ margin: "4px 0 0", fontSize: 24 }}>How the Solver Works</h2>
              </div>
              <button className="app-button secondary" onClick={() => setShowSolverModal(false)}>
                Close
              </button>
            </div>

            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              The solver is a fast browser-side heuristic rather than an exact optimizer. It is intended to produce good schedules quickly enough for iterative behavioral testing.
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}>
                <strong style={{ fontSize: 12 }}>Phase 1: Greedy construction</strong>
                <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                  Courses are ordered by total demand. Each course is placed into the timeslot that gives the best surrogate objective value under the current weights, while respecting hard slot capacity.
                </div>
              </div>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}>
                <strong style={{ fontSize: 12 }}>Phase 2: Local search</strong>
                <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                  After a complete timetable is built, the solver repeatedly tries random moves and pairwise swaps. Improvements are accepted, and occasional non-improving moves are allowed to escape weak local optima.
                </div>
              </div>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}>
                <strong style={{ fontSize: 12 }}>Solve vs. Re-solve</strong>
                <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                  <code>Solve</code> runs the heuristic with the current settings. <code>Re-solve</code> keeps the same weights and toggles but changes the random seed, so it explores a different local optimum from the same objective.
                </div>
              </div>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}>
                <strong style={{ fontSize: 12 }}>What the sliders do</strong>
                <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                  The solver scores candidate timetables with a surrogate objective of the form <code>coverage weight * total coverage - time weight * total time penalty - compactness weight * total compactness penalty + friday weight * total friday bonus</code>.
                </div>
                <div style={{ fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
                  <strong>Coverage</strong>: makes the solver care more about avoiding collisions among demanded courses, especially for high-demand classes.
                </div>
                <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                  <strong>Time penalty</strong>: makes the solver care more about group-specific disliked times, especially worker afternoons and athlete MWF mornings.
                </div>
                <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                  <strong>Compactness</strong>: makes the solver care more about reducing extra campus days and single-block days, with the strongest effect on commuters.
                </div>
                <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                  <strong>Friday bonus</strong>: rewards timetables that leave more students with no Friday classes. In the participant-facing surrogate this can be set to zero, even though the hidden true objective includes it.
                </div>
              </div>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}>
                <strong style={{ fontSize: 12 }}>Handling infeasibility</strong>
                <div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
                  Timeslot capacity is hard. User-facing constraints are enforced through large penalties rather than exact rejection. If the solver cannot satisfy all active targets simultaneously, it still returns the best complete timetable it found and keeps the warnings visible in the main interface.
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const RESOURCE_SLOTS = [
  { id: "R1", label: "Q1 Core", quarter: "Q1", lane: "Core", urgent: true, late: false, reserve: false, capacity: 1 },
  { id: "R2", label: "Q1 Flex", quarter: "Q1", lane: "Flex", urgent: true, late: false, reserve: false, capacity: 1 },
  { id: "R3", label: "Q2 Core", quarter: "Q2", lane: "Core", urgent: false, late: false, reserve: false, capacity: 1 },
  { id: "R4", label: "Q2 Flex", quarter: "Q2", lane: "Flex", urgent: false, late: false, reserve: false, capacity: 1 },
  { id: "R5", label: "Q3 Core", quarter: "Q3", lane: "Core", urgent: false, late: false, reserve: false, capacity: 1 },
  { id: "R6", label: "Q3 Flex", quarter: "Q3", lane: "Flex", urgent: false, late: false, reserve: false, capacity: 1 },
  { id: "R7", label: "Q4 Core", quarter: "Q4", lane: "Core", urgent: false, late: true, reserve: false, capacity: 1 },
  { id: "R8", label: "Q4 Flex", quarter: "Q4", lane: "Flex", urgent: false, late: true, reserve: false, capacity: 1 },
  { id: "R9", label: "Q5 Core", quarter: "Q5", lane: "Core", urgent: false, late: true, reserve: true, capacity: 1 },
  { id: "R10", label: "Q5 Flex", quarter: "Q5", lane: "Flex", urgent: false, late: true, reserve: true, capacity: 1 },
];

const RESOURCE_GROUPS = {
  community: {
    label: "Community Programs",
    short: "Community",
    icon: "C",
    color: "#d97a5a",
    count: 36,
    desiredCount: 4,
    eligibleProjects: ["P1", "P2", "P4", "P5", "P8", "P9", "P10", "P12"],
    timingMode: "early",
    timingSensitivity: 0.9,
    spreadWeight: 0.4,
  },
  operations: {
    label: "Operations",
    short: "Ops",
    icon: "O",
    color: "#5f8f7b",
    count: 34,
    desiredCount: 4,
    eligibleProjects: ["P1", "P3", "P4", "P5", "P6", "P7", "P10", "P11"],
    timingMode: "steady",
    timingSensitivity: 0.5,
    spreadWeight: 1,
  },
  innovation: {
    label: "Innovation Lab",
    short: "Innovation",
    icon: "I",
    color: "#5c6b94",
    count: 30,
    desiredCount: 4,
    eligibleProjects: ["P2", "P3", "P6", "P7", "P8", "P9", "P11", "P12"],
    timingMode: "late",
    timingSensitivity: 0.8,
    spreadWeight: 0.35,
  },
};

const RESOURCE_PROJECTS = [
  { id: "P1", name: "Transit Outreach", demandByGroup: { community: 18, operations: 10, innovation: 0 } },
  { id: "P2", name: "Data Platform", demandByGroup: { community: 10, operations: 0, innovation: 18 } },
  { id: "P3", name: "Permitting Upgrade", demandByGroup: { community: 0, operations: 16, innovation: 12 } },
  { id: "P4", name: "Clinic Expansion", demandByGroup: { community: 16, operations: 12, innovation: 0 } },
  { id: "P5", name: "Procurement Reform", demandByGroup: { community: 12, operations: 16, innovation: 0 } },
  { id: "P6", name: "Sensor Pilot", demandByGroup: { community: 0, operations: 12, innovation: 17 } },
  { id: "P7", name: "Workflow Automation", demandByGroup: { community: 0, operations: 15, innovation: 15 } },
  { id: "P8", name: "Youth Services", demandByGroup: { community: 17, operations: 0, innovation: 10 } },
  { id: "P9", name: "Climate Sandbox", demandByGroup: { community: 11, operations: 0, innovation: 15 } },
  { id: "P10", name: "Community Hubs", demandByGroup: { community: 15, operations: 12, innovation: 0 } },
  { id: "P11", name: "Asset Mapping", demandByGroup: { community: 0, operations: 13, innovation: 14 } },
  { id: "P12", name: "Digital Inclusion", demandByGroup: { community: 13, operations: 0, innovation: 11 } },
].map((project) => ({
  ...project,
  totalDemand: Object.values(project.demandByGroup).reduce((sum, value) => sum + value, 0),
}));

const RESOURCE_VOICES = [
  {
    id: "rv1",
    group: "community",
    title: "Community Lead",
    text: "Projects that touch residents directly lose value if they wait too long. We can tolerate one later item, but the visible community-facing work needs to move early.",
  },
  {
    id: "rv2",
    group: "operations",
    title: "Operations Director",
    text: "What hurts us is fragmentation. If operational projects are spread thinly across too many quarters, implementation overhead eats the budget.",
  },
  {
    id: "rv3",
    group: "innovation",
    title: "Innovation Lab",
    text: "Exploratory work does not need to go first. In fact, later-phase funding is fine as long as we are not squeezed out entirely.",
  },
];

const RESOURCE_BRIEFINGS = [
  {
    id: "rb1",
    title: "Budget Office",
    role: "Coverage",
    text: "A good allocation funds the most demanded work first. If highly requested projects get pushed out, the process will look disconnected from need.",
  },
  {
    id: "rb2",
    title: "Equity Review",
    role: "Prioritization",
    text: "Community-facing projects are the easiest to underserve because internal teams can always argue their case more clearly. Watch who loses when tradeoffs get tight.",
  },
  {
    id: "rb3",
    title: "Portfolio Manager",
    role: "Diagnosis",
    text: "The portfolio can look balanced overall while one stakeholder group is effectively starved. The subgroup view matters more than the average story.",
  },
];

const RESOURCE_TRUE_WEIGHTS = {
  coverage: 10,
  timingPenalty: 2.2,
  spreadPenalty: 2.4,
  reserveBonus: 1,
};

const RESOURCE_DEFAULT_WEIGHTS = {
  coverage: 10,
  timingPenalty: 2.2,
  spreadPenalty: 2.4,
  reserveBonus: 0,
};

const RESOURCE_DEFAULT_CONSTRAINTS = {
  protectCommunityEarly: false,
  keepOpsConcentrated: false,
};

const RESOURCE_SLOT_MAP = Object.fromEntries(RESOURCE_SLOTS.map((slot) => [slot.id, slot]));
const RESOURCE_PROJECT_MAP = Object.fromEntries(RESOURCE_PROJECTS.map((project) => [project.id, project]));
const RESOURCE_QUARTERS = ["Q1", "Q2", "Q3", "Q4", "Q5"];
const RESOURCE_PRECOMPUTED_OPTIMAL = {
  P1: "R1",
  P2: "R8",
  P3: "R7",
  P4: "R2",
  P5: "R3",
  P6: "R9",
  P7: "R4",
  P8: "R5",
  P9: "R10",
  P10: "R6",
  P11: "R8",
  P12: "R5",
};

function ResourceProjectChip({ project, dragging = false }) {
  const draggable = useDraggable({
    id: `resource-${project.id}`,
    data: { type: "resource-project", projectId: project.id },
  });

  return (
    <div
      ref={draggable.setNodeRef}
      {...draggable.attributes}
      {...draggable.listeners}
      className="course-chip"
      style={{
        transform: CSS.Translate.toString(draggable.transform),
        transition: draggable.transition,
        opacity: dragging || draggable.isDragging ? 0.45 : 1,
        cursor: "grab",
        userSelect: "none",
        touchAction: "none",
        padding: "8px 10px",
        borderRadius: 12,
        border: `1px solid ${getDemandColor(project.totalDemand)}`,
        background: `${getDemandColor(project.totalDemand)}18`,
        display: "grid",
        gap: 2,
        fontSize: 11,
        lineHeight: 1.25,
        position: "relative",
      }}
    >
      <strong>{project.id}</strong>
      <span>{project.name}</span>
      <span style={{ color: COLORS.muted }}>Demand {project.totalDemand}</span>
      <div className="course-chip-tooltip">
        <div><strong>{project.id}</strong> demand</div>
        <div>Community: {project.demandByGroup.community}</div>
        <div>Operations: {project.demandByGroup.operations}</div>
        <div>Innovation: {project.demandByGroup.innovation}</div>
      </div>
    </div>
  );
}

function ResourceDropZone({ id, title, subtitle, projects, load, activeProjectId, isHolding = false }) {
  const droppable = useDroppable({ id });
  const isFull = !isHolding && load >= RESOURCE_SLOT_MAP[id]?.capacity;

  return (
    <div
      ref={droppable.setNodeRef}
      style={{
        minHeight: isHolding ? 118 : 174,
        borderRadius: 16,
        border: `1px solid ${
          droppable.isOver ? (isFull ? COLORS.danger : COLORS.accent) : isFull ? COLORS.warning : COLORS.border
        }`,
        background: droppable.isOver ? (isFull ? "#fff2ef" : "#eef5f6") : "#fff",
        padding: 12,
        display: "grid",
        alignContent: "start",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 11, color: COLORS.muted }}>{subtitle}</div> : null}
        </div>
        {!isHolding ? <div style={{ fontSize: 11, color: isFull ? COLORS.warning : COLORS.muted }}>{load}/1</div> : null}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {projects.map((project) => (
          <ResourceProjectChip key={project.id} project={project} dragging={activeProjectId === project.id} />
        ))}
        {projects.length === 0 ? <div style={{ fontSize: 11, color: COLORS.muted }}>{isHolding ? "All projects assigned." : "Drop project here"}</div> : null}
      </div>
    </div>
  );
}

function ResourceWorkbench() {
  const [round, setRound] = useState(1);
  const [weights, setWeights] = useState(RESOURCE_DEFAULT_WEIGHTS);
  const [constraints, setConstraints] = useState({ ...RESOURCE_DEFAULT_CONSTRAINTS });
  const [assignment, setAssignment] = useState(Object.fromEntries(RESOURCE_PROJECTS.map((project) => [project.id, null])));
  const [solverSeed, setSolverSeed] = useState(211);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [toast, setToast] = useState("");
  const [showUtilityModal, setShowUtilityModal] = useState(false);
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [showSolverModal, setShowSolverModal] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [solveSummary, setSolveSummary] = useState("No solve run yet.");

  const students = useMemo(() => {
    const rng = createRng(BASELINE_SEED + 19);
    const rows = [];
    let sequence = 1;
    Object.entries(RESOURCE_GROUPS).forEach(([group, config]) => {
      for (let index = 0; index < config.count; index += 1) {
        rows.push({
          id: `R${String(sequence).padStart(3, "0")}`,
          group,
          desiredProjects: sampleWithoutReplacement(config.eligibleProjects, config.desiredCount, rng),
        });
        sequence += 1;
      }
    });
    return rows;
  }, []);

  function evaluateResourceAssignment(nextAssignment, nextWeights = weights, nextConstraints = constraints) {
    const perGroup = Object.fromEntries(
      Object.keys(RESOURCE_GROUPS).map((group) => [
        group,
        { group, label: RESOURCE_GROUPS[group].label, color: RESOURCE_GROUPS[group].color, count: 0, totalUtility: 0, fullCoverage: 0, avgQuarters: 0 },
      ])
    );
    const components = { coverage: 0, timingPenalty: 0, spreadPenalty: 0, reserveBonus: 0 };

    students.forEach((row) => {
      const config = RESOURCE_GROUPS[row.group];
      const placed = row.desiredProjects
        .map((projectId) => ({ slotId: nextAssignment[projectId], slot: nextAssignment[projectId] ? RESOURCE_SLOT_MAP[nextAssignment[projectId]] : null }))
        .filter((item) => item.slot);
      const coverage = new Set(placed.map((item) => item.slotId)).size / row.desiredProjects.length;
      let timingPenalty = 0;
      placed.forEach((item) => {
        if (config.timingMode === "early" && item.slot.late) timingPenalty += config.timingSensitivity;
        if (config.timingMode === "late" && item.slot.urgent) timingPenalty += config.timingSensitivity;
        if (config.timingMode === "steady" && (item.slot.quarter === "Q1" || item.slot.quarter === "Q5")) timingPenalty += config.timingSensitivity;
      });
      const quarters = Array.from(new Set(placed.map((item) => item.slot.quarter)));
      const spreadPenalty = config.spreadWeight * quarters.length;
      const reserveBonus = placed.every((item) => item.slot.quarter !== "Q5") ? 1 : 0;
      const utility =
        RESOURCE_TRUE_WEIGHTS.coverage * coverage -
        RESOURCE_TRUE_WEIGHTS.timingPenalty * timingPenalty -
        RESOURCE_TRUE_WEIGHTS.spreadPenalty * spreadPenalty +
        RESOURCE_TRUE_WEIGHTS.reserveBonus * reserveBonus;

      components.coverage += coverage;
      components.timingPenalty += timingPenalty;
      components.spreadPenalty += spreadPenalty;
      components.reserveBonus += reserveBonus;

      const bucket = perGroup[row.group];
      bucket.count += 1;
      bucket.totalUtility += utility;
      bucket.avgQuarters += quarters.length;
      if (coverage === 1) bucket.fullCoverage += 1;
    });

    Object.values(perGroup).forEach((bucket) => {
      if (!bucket.count) return;
      bucket.avgUtility = bucket.totalUtility / bucket.count;
      bucket.fullCoverageRate = bucket.fullCoverage / bucket.count;
      bucket.avgQuarters /= bucket.count;
    });

    const trueScore =
      RESOURCE_TRUE_WEIGHTS.coverage * components.coverage -
      RESOURCE_TRUE_WEIGHTS.timingPenalty * components.timingPenalty -
      RESOURCE_TRUE_WEIGHTS.spreadPenalty * components.spreadPenalty +
      RESOURCE_TRUE_WEIGHTS.reserveBonus * components.reserveBonus;

    const surrogateScore =
      nextWeights.coverage * components.coverage -
      nextWeights.timingPenalty * components.timingPenalty -
      nextWeights.spreadPenalty * components.spreadPenalty +
      nextWeights.reserveBonus * components.reserveBonus;

    const violations = [];
    const loads = Object.fromEntries(RESOURCE_SLOTS.map((slot) => [slot.id, 0]));
    Object.values(nextAssignment).forEach((slotId) => {
      if (slotId) loads[slotId] += 1;
    });
    Object.entries(loads).forEach(([slotId, load]) => {
      if (load > RESOURCE_SLOT_MAP[slotId].capacity) violations.push(`Capacity exceeded in ${RESOURCE_SLOT_MAP[slotId].label}`);
    });
    if (nextConstraints.protectCommunityEarly) {
      const communityLate = RESOURCE_PROJECTS.filter(
        (project) => project.demandByGroup.community > 0 && RESOURCE_SLOT_MAP[nextAssignment[project.id]]?.late
      ).length;
      if (communityLate > 2) violations.push("Too many community-facing projects are placed late");
    }
    if (nextConstraints.keepOpsConcentrated) {
      if ((perGroup.operations?.avgQuarters ?? 0) > 2.4) violations.push("Operations projects are spread across too many quarters");
    }

    return {
      trueScore,
      surrogateScore,
      penalizedSurrogate: surrogateScore - violations.length * 100000,
      perGroup,
      overallCoverage:
        Object.values(perGroup).reduce((sum, bucket) => sum + bucket.fullCoverage, 0) / students.length,
      reserveFreeRate:
        students.filter((row) =>
          row.desiredProjects.every((projectId) => !RESOURCE_SLOT_MAP[nextAssignment[projectId]]?.reserve)
        ).length / students.length,
      components,
      violations,
      lateCommunityProjects: RESOURCE_PROJECTS.filter(
        (project) => project.demandByGroup.community > 0 && RESOURCE_SLOT_MAP[nextAssignment[project.id]]?.late
      ).length,
    };
  }

  function solveResource(seed = solverSeed, randomize = false) {
    if (isSolving) return;
    setIsSolving(true);
    setSolveSummary("Searching portfolio allocations...");
    window.setTimeout(() => {
      let bestAssignment = null;
      let bestMetrics = null;
      for (let restart = 0; restart < 10; restart += 1) {
        const rng = createRng(seed + restart * 991);
        const working = Object.fromEntries(RESOURCE_PROJECTS.map((project) => [project.id, null]));
        const loads = Object.fromEntries(RESOURCE_SLOTS.map((slot) => [slot.id, 0]));
        const ordered = [...RESOURCE_PROJECTS].sort((left, right) => right.totalDemand - left.totalDemand || (rng() > 0.5 ? 1 : -1));

        ordered.forEach((project) => {
          let bestSlot = null;
          let bestScore = -Infinity;
          RESOURCE_SLOTS.forEach((slot) => {
            if (loads[slot.id] >= slot.capacity) return;
            const trial = { ...working, [project.id]: slot.id };
            const score = evaluateResourceAssignment(trial).penalizedSurrogate;
            if (score > bestScore) {
              bestScore = score;
              bestSlot = slot.id;
            }
          });
          working[project.id] = bestSlot;
          if (bestSlot) loads[bestSlot] += 1;
        });

        let currentMetrics = evaluateResourceAssignment(working);
        let currentScore = currentMetrics.penalizedSurrogate;
        for (let step = 0; step < 5000; step += 1) {
          const next = { ...working };
          const first = RESOURCE_PROJECTS[Math.floor(rng() * RESOURCE_PROJECTS.length)];
          if (rng() < 0.65) {
            const nextSlot = RESOURCE_SLOTS[Math.floor(rng() * RESOURCE_SLOTS.length)];
            if (next[first.id] === nextSlot.id) continue;
            next[first.id] = nextSlot.id;
          } else {
            const second = RESOURCE_PROJECTS[Math.floor(rng() * RESOURCE_PROJECTS.length)];
            if (second.id === first.id) continue;
            [next[first.id], next[second.id]] = [next[second.id], next[first.id]];
          }
          const nextMetrics = evaluateResourceAssignment(next);
          if (nextMetrics.penalizedSurrogate > currentScore || rng() < 0.02) {
            Object.assign(working, next);
            currentMetrics = nextMetrics;
            currentScore = nextMetrics.penalizedSurrogate;
          }
        }
        if (!bestMetrics || currentMetrics.penalizedSurrogate > bestMetrics.penalizedSurrogate) {
          bestAssignment = { ...working };
          bestMetrics = currentMetrics;
        }
      }
      setAssignment(bestAssignment ?? assignment);
      setSolveSummary(bestMetrics?.violations.length ? "Loaded best portfolio with warnings." : "Portfolio solution loaded.");
      setToast(bestMetrics?.violations.length ? "Solved with warnings." : "Portfolio solved.");
      if (randomize) setSolverSeed((current) => current + 17);
      setIsSolving(false);
    }, 40);
  }

  const metrics = useMemo(() => evaluateResourceAssignment(assignment), [assignment, weights, constraints]);
  const optimalMetrics = useMemo(() => evaluateResourceAssignment(RESOURCE_PRECOMPUTED_OPTIMAL, RESOURCE_TRUE_WEIGHTS, RESOURCE_DEFAULT_CONSTRAINTS), []);
  const resourceLayout = useMemo(() => {
    const bySlot = Object.fromEntries(RESOURCE_SLOTS.map((slot) => [slot.id, []]));
    const unassigned = [];
    RESOURCE_PROJECTS.forEach((project) => {
      const slotId = assignment[project.id];
      if (slotId && bySlot[slotId]) bySlot[slotId].push(project);
      else unassigned.push(project);
    });
    return { bySlot, unassigned };
  }, [assignment]);
  const loads = Object.fromEntries(RESOURCE_SLOTS.map((slot) => [slot.id, 0]));
  Object.values(assignment).forEach((slotId) => {
    if (slotId) loads[slotId] += 1;
  });
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const activeProject = activeProjectId ? RESOURCE_PROJECT_MAP[activeProjectId] : null;
  const resourceBars = Object.values(metrics.perGroup).map((entry) => ({ name: entry.label, value: entry.avgUtility, color: entry.color }));

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 1660, minWidth: 1540, margin: "0 auto" }}>
      <header style={panelStyle({ padding: 16, display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" })}>
        <div>
          <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>Alternate Context</div>
          <h1 style={{ margin: "4px 0 0", fontSize: 28 }}>Resource Allocation Experiment Workbench</h1>
          <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 4 }}>
            Same experimental logic as the timetable interface, recast as project portfolio allocation.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 12, background: COLORS.accentSoft }}>
            <span style={{ fontSize: 12, color: COLORS.muted }}>Round</span>
            <button className="app-button ghost" onClick={() => setRound((value) => Math.max(1, value - 1))}>-</button>
            <strong>{round}</strong>
            <button className="app-button ghost" onClick={() => setRound((value) => value + 1)}>+</button>
          </div>
          <button className="app-button secondary" onClick={() => setShowUtilityModal(true)}>Show True Utility</button>
          <button className="app-button secondary" onClick={() => setShowDesignModal(true)}>Design Intent</button>
          <button className="app-button secondary" onClick={() => setShowSolverModal(true)}>How Solver Works</button>
          <button className="app-button secondary" onClick={() => {
            setAssignment(Object.fromEntries(RESOURCE_PROJECTS.map((project) => [project.id, null])));
            setWeights(RESOURCE_DEFAULT_WEIGHTS);
            setConstraints({ ...RESOURCE_DEFAULT_CONSTRAINTS });
            setRound(1);
            setToast("Reset to empty portfolio.");
          }}>Reset</button>
        </div>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "290px minmax(820px, 1fr) 520px", gap: 14, alignItems: "stretch" }}>
        <aside style={{ display: "grid", gap: 14, height: "calc(100vh - 210px)", overflow: "auto", alignContent: "start", paddingRight: 2 }}>
          <SectionCard title="Stakeholder Voices">
            {RESOURCE_VOICES.map((voice) => (
              <div key={voice.id} style={{ borderLeft: `4px solid ${RESOURCE_GROUPS[voice.group].color}`, borderRadius: 12, background: "#fbfcfd", padding: 12, display: "grid", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 999, display: "inline-flex", justifyContent: "center", alignItems: "center", color: "#fff", background: RESOURCE_GROUPS[voice.group].color, fontSize: 11, fontWeight: 700 }}>
                    {RESOURCE_GROUPS[voice.group].icon}
                  </span>
                  <strong style={{ fontSize: 12 }}>{voice.title}</strong>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.45 }}>{voice.text}</div>
              </div>
            ))}
          </SectionCard>
          <SectionCard title="Portfolio Briefings">
            {RESOURCE_BRIEFINGS.map((briefing) => (
              <div key={briefing.id} style={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: 12, display: "grid", gap: 8 }}>
                <div>
                  <strong style={{ fontSize: 12 }}>{briefing.title}</strong>
                  <div style={{ color: COLORS.muted, fontSize: 11 }}>{briefing.role}</div>
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.45 }}>{briefing.text}</div>
              </div>
            ))}
          </SectionCard>
        </aside>

        <main style={{ display: "grid", gap: 14 }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(event) => setActiveProjectId(event.active.id.replace("resource-", ""))} onDragEnd={(event) => {
            setActiveProjectId(null);
            const rawId = event.active?.id;
            const targetId = event.over?.id;
            if (!rawId || !targetId) return;
            const projectId = rawId.replace("resource-", "");
            if (targetId === "resource-holding") {
              setAssignment((current) => ({ ...current, [projectId]: null }));
              return;
            }
            if (!RESOURCE_SLOT_MAP[targetId]) return;
            setAssignment((current) => ({ ...current, [projectId]: targetId }));
          }}>
            <section style={panelStyle({ padding: 16, display: "grid", gap: 14 })}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Allocation Grid</div>
                  <div style={{ fontSize: 13 }}>Assign projects across quarters and funding lanes.</div>
                </div>
                <div style={{ fontSize: 12, color: metrics.violations.length ? COLORS.danger : COLORS.success }}>
                  {metrics.violations.length ? `${metrics.violations.length} active warnings` : "No active warnings"}
                </div>
              </div>
              {isSolving ? (
                <div style={{ borderRadius: 12, background: "#eef5f6", border: `1px solid ${COLORS.border}`, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <div className="solver-spinner" />
                  <span>Solver is searching and will load the best portfolio allocation into this grid.</span>
                </div>
              ) : null}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(150px, 1fr))", gap: 12 }}>
                {RESOURCE_QUARTERS.map((quarter, index) => (
                  <div key={quarter} style={{ display: "grid", gap: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>{quarter}</div>
                    {["Core", "Flex"].map((lane) => {
                      const slot = RESOURCE_SLOTS[index * 2 + (lane === "Core" ? 0 : 1)];
                      return <ResourceDropZone key={slot.id} id={slot.id} title={slot.label} subtitle={lane} projects={resourceLayout.bySlot[slot.id]} load={loads[slot.id]} activeProjectId={activeProjectId} />;
                    })}
                  </div>
                ))}
              </div>
              <ResourceDropZone id="resource-holding" title="Unassigned Projects" subtitle="Drag into the portfolio" projects={resourceLayout.unassigned} load={resourceLayout.unassigned.length} activeProjectId={activeProjectId} isHolding />
            </section>
            <DragOverlay>{activeProject ? <ResourceProjectChip project={activeProject} dragging /> : null}</DragOverlay>
          </DndContext>
        </main>

        <aside style={{ display: "grid", height: "calc(100vh - 210px)", overflow: "auto", alignContent: "start", paddingRight: 2 }}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 220px", gap: 14, alignItems: "start" }}>
            <SectionCard title="Metrics">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={panelStyle({ padding: 12 })}>
                  <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Current F(x)</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{formatNumber(metrics.trueScore)}</div>
                </div>
                <div style={panelStyle({ padding: 12, borderColor: COLORS.success })}>
                  <div style={{ fontSize: 11, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>% of Reference</div>
                  <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{formatNumber((metrics.trueScore / optimalMetrics.trueScore) * 100)}%</div>
                </div>
              </div>
              <div style={{ height: 170 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Average Utility by Group</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={resourceBars} layout="vertical" margin={{ left: 0, right: 10, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf0f2" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatNumber(value)} />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {resourceBars.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Portfolio Summary</div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}><span>Overall full coverage</span><span>{formatNumber(metrics.overallCoverage * 100)}%</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}><span>Reserve-free rate</span><span>{formatNumber(metrics.reserveFreeRate * 100)}%</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}><span>Late community projects</span><span>{metrics.lateCommunityProjects}</span></div>
              </div>
            </SectionCard>
            <SectionCard title="Solver">
              <button className="app-button primary" onClick={() => solveResource(solverSeed, false)} disabled={isSolving}>{isSolving ? "Solving..." : "Solve"}</button>
              <button className="app-button secondary" onClick={() => solveResource(solverSeed + 31, true)} disabled={isSolving}>{isSolving ? "Working..." : "Re-solve"}</button>
              <button className="app-button secondary" onClick={() => {
                setAssignment(RESOURCE_PRECOMPUTED_OPTIMAL);
                setWeights({ ...RESOURCE_TRUE_WEIGHTS });
                setConstraints({ ...RESOURCE_DEFAULT_CONSTRAINTS });
                setSolveSummary("Loaded the saved reference allocation.");
              }} disabled={isSolving}>Load Saved Reference</button>
              <div style={panelStyle({ padding: 10, background: "#fbfcfd" })}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div className={isSolving ? "solver-spinner" : "solver-spinner idle"} />
                  <strong style={{ fontSize: 12 }}>{isSolving ? "Solver running" : "Solver status"}</strong>
                </div>
                <div style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.45 }}>{solveSummary}</div>
              </div>
              {[
                ["coverage", "coverage"],
                ["timingPenalty", "timing"],
                ["spreadPenalty", "portfolio spread"],
                ["reserveBonus", "reserve bonus"],
              ].map(([key, label]) => (
                <label key={key} style={{ display: "grid", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}><span>{label}</span><strong>{weights[key]}</strong></div>
                  <input type="range" min="0" max="12" step="0.5" value={weights[key]} onChange={(event) => setWeights((current) => ({ ...current, [key]: Number(event.target.value) }))} />
                </label>
              ))}
              <div style={{ fontSize: 12, fontWeight: 700, marginTop: 6 }}>Simple Constraints</div>
              <label className="check-row compact"><input type="checkbox" checked={constraints.protectCommunityEarly} onChange={(event) => setConstraints((current) => ({ ...current, protectCommunityEarly: event.target.checked }))} /><span>Limit late community-facing projects</span></label>
              <label className="check-row compact"><input type="checkbox" checked={constraints.keepOpsConcentrated} onChange={(event) => setConstraints((current) => ({ ...current, keepOpsConcentrated: event.target.checked }))} /><span>Keep operations work concentrated</span></label>
            </SectionCard>
          </div>
        </aside>
      </div>

      <footer style={panelStyle({ padding: "12px 16px", display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontSize: 13 })}>
        <span>Current F(x) = {formatNumber(metrics.trueScore)}</span>
        <span>Reference F(x_ref) = {formatNumber(optimalMetrics.trueScore)}</span>
        <span>Gap to reference = {formatNumber(((optimalMetrics.trueScore - metrics.trueScore) / optimalMetrics.trueScore) * 100)}%</span>
        <span>Round {round}</span>
      </footer>

      {toast ? <div style={{ position: "fixed", top: 18, right: 18, background: COLORS.accent, color: "#fff", borderRadius: 12, padding: "10px 14px", fontSize: 12, boxShadow: "0 14px 30px rgba(39, 76, 87, 0.24)" }}>{toast}</div> : null}

      {showUtilityModal ? (
        <div onClick={() => setShowUtilityModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(18, 25, 32, 0.42)", display: "grid", placeItems: "center", padding: 18, zIndex: 10 }}>
          <div onClick={(event) => event.stopPropagation()} style={panelStyle({ width: "min(860px, 100%)", maxHeight: "85vh", overflow: "auto", padding: 18, display: "grid", gap: 14 })}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div><div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Hidden Objective</div><h2 style={{ margin: "4px 0 0", fontSize: 24 }}>Resource Allocation True Utility</h2></div>
              <button className="app-button secondary" onClick={() => setShowUtilityModal(false)}>Close</button>
            </div>
            <div style={panelStyle({ padding: 14, background: "#fbfcfd" })}>
              <code style={{ fontSize: 13 }}>U_g(x) = 10 * coverage - 2.2 * timing_penalty - 2.4 * spread_penalty + 1 * reserve_bonus</code>
              <div style={{ marginTop: 10 }}><code style={{ fontSize: 13 }}>F(x) = \u2211_g U_g(x)</code></div>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}>
              This alternate interface preserves the same basic cognitive structure as the timetable experiment. Coverage captures whether each group's desired projects are funded without quarter collisions, timing penalties capture phase preferences, spread penalties capture implementation fragmentation, and the hidden reserve bonus rewards staying out of the reserve quarter.
            </div>
          </div>
        </div>
      ) : null}

      {showDesignModal ? (
        <div onClick={() => setShowDesignModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(18, 25, 32, 0.42)", display: "grid", placeItems: "center", padding: 18, zIndex: 10 }}>
          <div onClick={(event) => event.stopPropagation()} style={panelStyle({ width: "min(900px, 100%)", maxHeight: "85vh", overflow: "auto", padding: 18, display: "grid", gap: 14 })}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div><div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Experiment Design</div><h2 style={{ margin: "4px 0 0", fontSize: 24 }}>How This Context Mirrors the Four Dimensions</h2></div>
              <button className="app-button secondary" onClick={() => setShowDesignModal(false)}>Close</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}><strong style={{ fontSize: 12 }}>Interpretation</strong><div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>Voices use portfolio language like “move early,” “avoid fragmentation,” and “later is fine,” which still must be translated into concrete model weights.</div></div>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}><strong style={{ fontSize: 12 }}>Prioritization</strong><div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>Budget, equity, and implementation concerns intentionally pull in different directions so the participant has to balance them rather than optimize a single spoken value.</div></div>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}><strong style={{ fontSize: 12 }}>Diagnosis</strong><div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>The dashboard is built to expose subgroup harm, demand conflicts, and reserve usage rather than revealing the objective directly.</div></div>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}><strong style={{ fontSize: 12 }}>Discovery</strong><div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>The hidden structure is that leaving projects out of the reserve quarter is globally rewarded even when stakeholders never say that outright.</div></div>
            </div>
          </div>
        </div>
      ) : null}

      {showSolverModal ? (
        <div onClick={() => setShowSolverModal(false)} style={{ position: "fixed", inset: 0, background: "rgba(18, 25, 32, 0.42)", display: "grid", placeItems: "center", padding: 18, zIndex: 10 }}>
          <div onClick={(event) => event.stopPropagation()} style={panelStyle({ width: "min(860px, 100%)", maxHeight: "85vh", overflow: "auto", padding: 18, display: "grid", gap: 14 })}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div><div style={{ fontSize: 12, color: COLORS.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Solver Notes</div><h2 style={{ margin: "4px 0 0", fontSize: 24 }}>How the Resource Solver Works</h2></div>
              <button className="app-button secondary" onClick={() => setShowSolverModal(false)}>Close</button>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}><strong style={{ fontSize: 12 }}>Greedy plus local search</strong><div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>Projects are placed greedily by demand, then improved through random moves and swaps across quarters.</div></div>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}><strong style={{ fontSize: 12 }}>Slider meaning</strong><div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>Coverage favors funding demanded projects without collisions, timing penalty enforces quarter preference, spread penalty discourages implementation fragmentation, and reserve bonus rewards avoiding the reserve quarter.</div></div>
              <div style={panelStyle({ padding: 12, background: "#fbfcfd" })}><strong style={{ fontSize: 12 }}>Infeasibility handling</strong><div style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>Slot capacity is hard. User-facing constraints are soft targets with penalties, so the solver returns the best complete portfolio it can find and leaves warnings visible if targets remain unsatisfied.</div></div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("timetable");

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f1f5f6 0%, #f6f8f9 55%, #edf2f4 100%)", color: COLORS.text, padding: 16 }}>
      <div style={{ maxWidth: 1660, minWidth: 1540, margin: "0 auto 14px" }}>
        <div style={panelStyle({ padding: 10, display: "flex", gap: 10 })}>
          <button className={`app-button ${activeTab === "timetable" ? "primary" : "secondary"}`} onClick={() => setActiveTab("timetable")}>
            Timetabling Workbench
          </button>
          <button className={`app-button ${activeTab === "resource" ? "primary" : "secondary"}`} onClick={() => setActiveTab("resource")}>
            Resource Allocation Workbench
          </button>
        </div>
      </div>
      {activeTab === "timetable" ? <TimetableWorkbench /> : <ResourceWorkbench />}
    </div>
  );
}

export default App;
