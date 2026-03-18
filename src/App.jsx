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
  bg: "#f8f9fa",
  panel: "#ffffff",
  border: "#d7dde3",
  text: "#24303b",
  muted: "#697586",
  accent: "#264653",
  accentSoft: "#dbe7ea",
  danger: "#c8553d",
  warning: "#f4a261",
  success: "#4d908e",
  typeA: "#e07a5f",
  typeB: "#81b29a",
  typeC: "#f2cc8f",
  typeD: "#3d405b",
  typeE: "#7209b7",
  demandHigh: "#d96c5f",
  demandMid: "#5e81ac",
  demandLow: "#8aa189",
};

const TRUE_WEIGHTS = {
  coverage: 10,
  timePenalty: 2.5,
  gapPenalty: 3,
  patternPenalty: 1.5,
  fridayBonus: 1,
};

const DEFAULT_WEIGHTS = {
  coverage: 10,
  timePenalty: 2.5,
  gapPenalty: 3,
  patternPenalty: 1.5,
  fridayBonus: 0,
};

const TYPE_CONFIG = {
  A: {
    label: "Commuters",
    short: "Commuter",
    icon: "A",
    color: COLORS.typeA,
    count: 50,
    desiredCount: 4,
    eligibleCourses: ["C1", "C2", "C4", "C5", "C8", "C9", "C10", "C14"],
    timeMode: "morning",
    timeSensitivity: 0.5,
    gapSensitivity: 2,
    patternType: "minimize_days",
  },
  B: {
    label: "Working Students",
    short: "Worker",
    icon: "B",
    color: COLORS.typeB,
    count: 35,
    desiredCount: 4,
    eligibleCourses: ["C1", "C3", "C4", "C5", "C6", "C8", "C10", "C14"],
    timeMode: "afternoon",
    timeSensitivity: 1,
    gapSensitivity: 1,
    patternType: "none",
  },
  C: {
    label: "First-Years",
    short: "First-Year",
    icon: "C",
    color: COLORS.typeC,
    count: 45,
    desiredCount: 5,
    eligibleCourses: ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C11", "C12", "C15"],
    timeMode: "morning",
    timeSensitivity: 0.3,
    gapSensitivity: 0.5,
    patternType: "spread_days",
  },
  D: {
    label: "Graduate Students",
    short: "Grad",
    icon: "D",
    color: COLORS.typeD,
    count: 30,
    desiredCount: 4,
    eligibleCourses: ["C2", "C5", "C7", "C8", "C9", "C12", "C13"],
    timeMode: "none",
    timeSensitivity: 0,
    gapSensitivity: 1.5,
    patternType: "concentrate_days",
  },
  E: {
    label: "Student-Athletes",
    short: "Athlete",
    icon: "E",
    color: COLORS.typeE,
    count: 40,
    desiredCount: 4,
    eligibleCourses: ["C1", "C2", "C3", "C6", "C7", "C9", "C11", "C13", "C15"],
    timeMode: "mwfMorning",
    timeSensitivity: 1,
    gapSensitivity: 1,
    patternType: "none",
  },
};

const TIMESLOTS = [
  { id: "T1", label: "Mon AM", day: "Mon", block: "AM", early: true, afternoon: false, mwfMorning: true, capacity: 3 },
  { id: "T2", label: "Mon PM", day: "Mon", block: "PM", early: false, afternoon: true, mwfMorning: false, capacity: 3 },
  { id: "T3", label: "Tue AM", day: "Tue", block: "AM", early: true, afternoon: false, mwfMorning: false, capacity: 3 },
  { id: "T4", label: "Tue PM", day: "Tue", block: "PM", early: false, afternoon: true, mwfMorning: false, capacity: 3 },
  { id: "T5", label: "Wed AM", day: "Wed", block: "AM", early: true, afternoon: false, mwfMorning: true, capacity: 3 },
  { id: "T6", label: "Wed PM", day: "Wed", block: "PM", early: false, afternoon: true, mwfMorning: false, capacity: 3 },
  { id: "T7", label: "Thu AM", day: "Thu", block: "AM", early: true, afternoon: false, mwfMorning: false, capacity: 3 },
  { id: "T8", label: "Thu PM", day: "Thu", block: "PM", early: false, afternoon: true, mwfMorning: false, capacity: 3 },
  { id: "T9", label: "Fri AM", day: "Fri", block: "AM", early: true, afternoon: false, mwfMorning: true, capacity: 3 },
  { id: "T10", label: "Fri PM", day: "Fri", block: "PM", early: false, afternoon: true, mwfMorning: false, capacity: 3 },
];

const COURSES = [
  { id: "C1", name: "Intro to Economics", demandByType: { A: 20, B: 15, C: 25, D: 0, E: 10 } },
  { id: "C2", name: "Data Structures", demandByType: { A: 15, B: 0, C: 20, D: 15, E: 15 } },
  { id: "C3", name: "Organic Chemistry", demandByType: { A: 10, B: 10, C: 20, D: 0, E: 20 } },
  { id: "C4", name: "Modern Literature", demandByType: { A: 15, B: 10, C: 15, D: 5, E: 0 } },
  { id: "C5", name: "Statistics", demandByType: { A: 20, B: 15, C: 15, D: 15, E: 0 } },
  { id: "C6", name: "Art History", demandByType: { A: 0, B: 10, C: 20, D: 0, E: 15 } },
  { id: "C7", name: "Molecular Biology", demandByType: { A: 10, B: 0, C: 15, D: 10, E: 20 } },
  { id: "C8", name: "Macroeconomics", demandByType: { A: 20, B: 15, C: 10, D: 10, E: 0 } },
  { id: "C9", name: "Linear Algebra", demandByType: { A: 10, B: 0, C: 0, D: 20, E: 10 } },
  { id: "C10", name: "Constitutional Law", demandByType: { A: 15, B: 15, C: 10, D: 0, E: 0 } },
  { id: "C11", name: "Environmental Science", demandByType: { A: 10, B: 5, C: 20, D: 0, E: 20 } },
  { id: "C12", name: "Philosophy of Mind", demandByType: { A: 0, B: 0, C: 15, D: 15, E: 0 } },
  { id: "C13", name: "Advanced Algorithms", demandByType: { A: 0, B: 0, C: 0, D: 20, E: 5 } },
  { id: "C14", name: "Public Health Policy", demandByType: { A: 10, B: 10, C: 10, D: 0, E: 0 } },
  { id: "C15", name: "Music Theory", demandByType: { A: 0, B: 0, C: 15, D: 0, E: 10 } },
].map((course) => {
  const totalDemand = Object.values(course.demandByType).reduce((sum, value) => sum + value, 0);
  return { ...course, totalDemand };
});

const STUDENT_NARRATIVES = [
  { type: "A", text: "I spend over an hour on the bus each way, so I really need my schedule to be compact. Having random free periods in the middle of the day is the worst. I'd rather have a tough morning and be done early than be stuck on campus all day with holes in my schedule.", interpretation: "Interpretation: commuters primarily signal high gap disutility and a willingness to trade off some morning pain for compact schedules. This should push the experimenter toward reducing idle campus time, not simply avoiding mornings." },
  { type: "B", text: "I work at a restaurant most afternoons. I've managed to make it work with afternoon classes before but it's really stressful and my grades suffer. It would mean a lot if most of my classes could be in the morning.", interpretation: "Interpretation: working students are strongly revealing afternoon aversion. This is direct evidence for prioritizing morning placement of courses they demand." },
  { type: "C", text: "I don't want to be one of those students who has class from 9 to 5 on Monday and then nothing the rest of the week. I want to actually have time to hang out, join clubs, and not feel like one day is totally overwhelming.", interpretation: "Interpretation: first-years care about avoiding overloaded single days. The intended takeaway is the spread-days pattern penalty, not gap minimization or strict time-of-day preferences." },
  { type: "D", text: "I'm in the lab most of the week, so I really need my classes concentrated into as few days as possible. Coming in for a single class on a random day completely fragments my research time.", interpretation: "Interpretation: graduate students mainly dislike being pulled onto campus across many distinct days. The design target here is concentrated class days rather than early/late timing." },
  { type: "E", text: "Mornings are tough because of practice. Having a class at 9am means I either skip practice or show up to class exhausted and late. If my classes could start after lunch on practice days, that would be ideal.", interpretation: "Interpretation: athletes are not broadly anti-morning. They specifically dislike Monday, Wednesday, Friday morning placements, which maps to the MWF morning penalty." },
  { type: "A", text: "The worst is when I have a class at 9, then nothing until 2. That's five hours I'm just trapped on campus. If I could have all my classes back-to-back, even if it means a really packed morning, I'd take that over a spread-out day any time.", interpretation: "Interpretation: this reinforces that commuters' strongest concern is schedule compactness. The correct reading is to emphasize gap reduction and fewer campus days, even if mornings remain present." },
  { type: "B", text: "I picked up extra shifts this semester to cover tuition. Anything after 2pm is basically impossible for me. Morning classes are when I'm free and focused.", interpretation: "Interpretation: this is another strong cue that afternoon scheduling harms working students. It is meant to justify heavier weight on their time penalty or explicit afternoon constraints." },
  { type: "C", text: "My friend had four classes on Tuesday last year and literally nothing on Thursday and Friday. I want a balanced schedule where no single day is a disaster.", interpretation: "Interpretation: this narrative is about daily load balance for first-years. The intended signal is to avoid four-plus desired courses landing on one day." },
  { type: "E", text: "It's not every morning that's a problem. Tuesdays and Thursdays I'm totally free in the morning. But Monday, Wednesday, Friday before 11am is a nonstarter for most of the team.", interpretation: "Interpretation: this is the cleanest clue that the athlete preference is targeted, not global. The experimenter should infer a narrow MWF-morning restriction rather than a universal late-day bias." },
  { type: "D", text: "Honestly, I don't care what time my classes are. What kills me is having to commute to campus four or five days a week for one class each day. Two days, all my classes, done.", interpretation: "Interpretation: graduate students are intended to be insensitive to time-of-day and highly sensitive to days-on-campus. The correct move is to cluster their demanded courses into fewer days." },
];

const STAKEHOLDER_BRIEFINGS = [
  { name: "Department Chair", role: "Enrollment", text: "Coverage should be the top priority. If students can't get the courses they need because of scheduling conflicts, they'll switch departments or transfer.", interpretation: "Interpretation: this briefing is meant to push experimenters toward coverage-first reasoning and to notice that popular-course conflicts drive much of total welfare." },
  { name: "Student Government Representative", role: "Equity", text: "Working students and commuters are the most vulnerable populations. If the timetable systematically disadvantages them, that's a structural equity failure.", interpretation: "Interpretation: this is a cue to overweight harms borne by commuters and workers. The design intent is to direct attention to gap burden and afternoon exposure as equity issues." },
  { name: "Faculty Advisor", role: "Retention", text: "The biggest driver of student satisfaction is avoiding brutal days with long gaps. Time preferences are secondary. Burnout comes from dead time on campus.", interpretation: "Interpretation: the correct read is that gap minimization is a central welfare lever. This briefing is designed to nudge the solver toward compact schedules over simple clock-time preferences." },
  { name: "Registrar's Office", role: "Feasibility", text: "The hard problem is getting 15 courses into 10 slots without creating a mess. Focus on feasibility and coverage first, then preferences if you have room.", interpretation: "Interpretation: this briefing is intended to anchor the experiment around hard feasibility and conflict management before fine-grained soft preferences." },
];

const COURSE_MAP = Object.fromEntries(COURSES.map((course) => [course.id, course]));
const SLOT_MAP = Object.fromEntries(TIMESLOTS.map((slot) => [slot.id, slot]));
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const BASELINE_STUDENT_SEED = 42;
const EMPTY_CONSTRAINTS = {
  maxAfternoonEnabled: false,
  maxAfternoonValue: 1,
  maxCoursesPerTypeEnabled: false,
  maxCoursesPerTypeValue: 2,
  noAthleteMwfMorning: false,
  minCoverageEnabled: false,
  minCoverageValue: 60,
  maxGapEnabled: false,
  maxGapValue: 1,
  customConstraintText: "",
};
const PRECOMPUTED_OPTIMAL_ASSIGNMENT = {
  C1: "T3",
  C2: "T3",
  C3: "T7",
  C4: "T5",
  C5: "T4",
  C6: "T8",
  C7: "T8",
  C8: "T3",
  C9: "T4",
  C10: "T5",
  C11: "T8",
  C12: "T7",
  C13: "T7",
  C14: "T6",
  C15: "T4",
};

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

function formatNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function getDemandColor(totalDemand) {
  if (totalDemand >= 60) return COLORS.demandHigh;
  if (totalDemand >= 40) return COLORS.demandMid;
  return COLORS.demandLow;
}

function createEmptyAssignment() {
  return Object.fromEntries(COURSES.map((course) => [course.id, null]));
}

function generateStudents(seed = 42) {
  const rng = createRng(seed);
  const students = [];
  let sequence = 1;

  Object.entries(TYPE_CONFIG).forEach(([type, config]) => {
    for (let index = 0; index < config.count; index += 1) {
      students.push({
        id: `S${String(sequence).padStart(3, "0")}`,
        type,
        desiredCourses: sampleWithoutReplacement(config.eligibleCourses, config.desiredCount, rng),
        gapSensitivity: config.gapSensitivity,
        patternType: config.patternType,
      });
      sequence += 1;
    }
  });

  return students;
}

function getSlotLoads(assignment) {
  const loads = Object.fromEntries(TIMESLOTS.map((slot) => [slot.id, 0]));
  Object.values(assignment).forEach((slotId) => {
    if (slotId) loads[slotId] += 1;
  });
  return loads;
}

function buildCoursesBySlot(assignment) {
  const bySlot = Object.fromEntries(TIMESLOTS.map((slot) => [slot.id, []]));
  const unassigned = [];

  COURSES.forEach((course) => {
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

function computeStudentOutcome(student, assignment) {
  const desiredAssignments = student.desiredCourses.map((courseId, order) => {
    const slotId = assignment[courseId];
    return {
      courseId,
      order,
      slotId,
      slot: slotId ? SLOT_MAP[slotId] : null,
    };
  });

  const slotCounts = {};
  const scheduledDesired = desiredAssignments.filter((item) => item.slot);
  scheduledDesired.forEach((item) => {
    slotCounts[item.slotId] = (slotCounts[item.slotId] ?? 0) + 1;
  });

  const attendedCount = Object.keys(slotCounts).length;
  const coverage = attendedCount / student.desiredCourses.length;

  const typeProfile = TYPE_CONFIG[student.type];
  let timePenalty = 0;
  scheduledDesired.forEach((item) => {
    if (typeProfile.timeMode === "morning" && item.slot.early) timePenalty += typeProfile.timeSensitivity;
    if (typeProfile.timeMode === "afternoon" && item.slot.afternoon) timePenalty += typeProfile.timeSensitivity;
    if (typeProfile.timeMode === "mwfMorning" && item.slot.mwfMorning) timePenalty += typeProfile.timeSensitivity;
  });

  const courseCountByDay = Object.fromEntries(DAYS.map((day) => [day, 0]));
  const blocksByDay = Object.fromEntries(DAYS.map((day) => [day, new Set()]));
  scheduledDesired.forEach((item) => {
    courseCountByDay[item.slot.day] += 1;
    blocksByDay[item.slot.day].add(item.slot.block);
  });

  let rawGapSlots = 0;
  let weightedGapBurden = 0;
  DAYS.forEach((day) => {
    const blocks = blocksByDay[day];
    if (blocks.size === 0 || blocks.size === 2) return;
    if (blocks.has("PM")) {
      rawGapSlots += 1;
      weightedGapBurden += 1.5;
    } else if (blocks.has("AM")) {
      rawGapSlots += 1;
      weightedGapBurden += 0.5;
    }
  });
  const gapPenalty = weightedGapBurden * student.gapSensitivity;

  const daysWithClasses = DAYS.filter((day) => courseCountByDay[day] > 0).length;
  const maxClassesSingleDay = Math.max(...Object.values(courseCountByDay));

  let patternPenalty = 0;
  if (student.patternType === "minimize_days") patternPenalty = daysWithClasses;
  if (student.patternType === "spread_days") patternPenalty = 2 * Math.max(0, maxClassesSingleDay - 3);
  if (student.patternType === "concentrate_days") patternPenalty = 2 * Math.max(0, daysWithClasses - 2);

  const fridayBonus = courseCountByDay.Fri === 0 ? 1 : 0;

  return {
    coverage,
    timePenalty,
    gapPenalty,
    patternPenalty,
    fridayBonus,
    rawGapSlots,
    daysWithClasses,
    maxClassesSingleDay,
    slotCounts,
    scheduledDesiredCount: scheduledDesired.length,
    workingAfternoons: scheduledDesired.filter((item) => student.type === "B" && item.slot.afternoon).length,
  };
}

function computeConstraintViolations(assignment, students, metrics, constraints) {
  const violations = [];
  const slotLoads = getSlotLoads(assignment);

  Object.entries(slotLoads).forEach(([slotId, load]) => {
    if (load > SLOT_MAP[slotId].capacity) {
      violations.push(`Capacity exceeded in ${SLOT_MAP[slotId].label}`);
    }
  });

  if (constraints.noAthleteMwfMorning) {
    const blockedCourses = COURSES.filter(
      (course) => course.demandByType.E > 0 && SLOT_MAP[assignment[course.id]]?.mwfMorning
    );
    if (blockedCourses.length > 0) {
      violations.push("Athlete-demanded courses placed in MWF mornings");
    }
  }

  if (constraints.maxAfternoonEnabled) {
    const threshold = Number(constraints.maxAfternoonValue);
    const workingStudents = metrics.studentRows.filter((row) => row.type === "B");
    if (workingStudents.some((row) => row.workingAfternoons > threshold)) {
      violations.push(`Working students exceed ${threshold} afternoon classes`);
    }
  }

  if (constraints.maxCoursesPerTypeEnabled) {
    const threshold = Number(constraints.maxCoursesPerTypeValue);
    Object.keys(TYPE_CONFIG).forEach((type) => {
      TIMESLOTS.forEach((slot) => {
        const count = COURSES.filter(
          (course) => assignment[course.id] === slot.id && course.demandByType[type] > 0
        ).length;
        if (count > threshold) {
          violations.push(`${TYPE_CONFIG[type].short} demand stacks above ${threshold} in ${slot.label}`);
        }
      });
    });
  }

  if (constraints.minCoverageEnabled) {
    const required = Number(constraints.minCoverageValue) / 100;
    if (metrics.fullCoverageRate < required) {
      violations.push(`Full coverage below ${constraints.minCoverageValue}%`);
    }
  }

  if (constraints.maxGapEnabled) {
    const threshold = Number(constraints.maxGapValue);
    if (metrics.studentRows.some((row) => row.rawGapSlots > threshold)) {
      violations.push(`Some students exceed ${threshold} gap slots`);
    }
  }

  return Array.from(new Set(violations));
}

function buildHistogram(values, bins = 8) {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = Math.max((max - min) / bins, 1);
  const histogram = Array.from({ length: bins }, (_, index) => ({
    label: `${formatNumber(min + index * width)}`,
    count: 0,
  }));

  values.forEach((value) => {
    const index = Math.min(bins - 1, Math.floor((value - min) / width));
    histogram[index].count += 1;
  });

  return histogram;
}

function evaluateAssignment(assignment, students, weights, constraints) {
  const components = {
    coverage: 0,
    timePenalty: 0,
    gapPenalty: 0,
    patternPenalty: 0,
    fridayBonus: 0,
  };

  const trueComponents = {
    coverage: 0,
    timePenalty: 0,
    gapPenalty: 0,
    patternPenalty: 0,
    fridayBonus: 0,
  };

  const perType = Object.fromEntries(
    Object.keys(TYPE_CONFIG).map((type) => [
      type,
      {
        type,
        label: TYPE_CONFIG[type].label,
        color: TYPE_CONFIG[type].color,
        count: 0,
        totalUtility: 0,
        fullyCovered: 0,
        totalGapBurden: 0,
        highGapCount: 0,
      },
    ])
  );

  const studentRows = students.map((student) => {
    const outcome = computeStudentOutcome(student, assignment);
    const utility =
      TRUE_WEIGHTS.coverage * outcome.coverage -
      TRUE_WEIGHTS.timePenalty * outcome.timePenalty -
      TRUE_WEIGHTS.gapPenalty * outcome.gapPenalty -
      TRUE_WEIGHTS.patternPenalty * outcome.patternPenalty +
      TRUE_WEIGHTS.fridayBonus * outcome.fridayBonus;

    perType[student.type].count += 1;
    perType[student.type].totalUtility += utility;
    perType[student.type].totalGapBurden += outcome.gapPenalty;
    perType[student.type].highGapCount += outcome.rawGapSlots >= 2 ? 1 : 0;
    if (outcome.coverage === 1) perType[student.type].fullyCovered += 1;

    components.coverage += outcome.coverage;
    components.timePenalty += outcome.timePenalty;
    components.gapPenalty += outcome.gapPenalty;
    components.patternPenalty += outcome.patternPenalty;
    components.fridayBonus += outcome.fridayBonus;

    trueComponents.coverage += outcome.coverage;
    trueComponents.timePenalty += outcome.timePenalty;
    trueComponents.gapPenalty += outcome.gapPenalty;
    trueComponents.patternPenalty += outcome.patternPenalty;
    trueComponents.fridayBonus += outcome.fridayBonus;

    return { ...outcome, id: student.id, type: student.type, utility };
  });

  const surrogateScore =
    weights.coverage * components.coverage -
    weights.timePenalty * components.timePenalty -
    weights.gapPenalty * components.gapPenalty -
    weights.patternPenalty * components.patternPenalty +
    weights.fridayBonus * components.fridayBonus;

  const trueScore =
    TRUE_WEIGHTS.coverage * trueComponents.coverage -
    TRUE_WEIGHTS.timePenalty * trueComponents.timePenalty -
    TRUE_WEIGHTS.gapPenalty * trueComponents.gapPenalty -
    TRUE_WEIGHTS.patternPenalty * trueComponents.patternPenalty +
    TRUE_WEIGHTS.fridayBonus * trueComponents.fridayBonus;

  const fullCoverageRate = studentRows.filter((row) => row.coverage === 1).length / studentRows.length;
  const utilities = studentRows.map((row) => row.utility);
  const histogram = buildHistogram(utilities, 8);
  const p10 = [...utilities].sort((left, right) => left - right)[Math.floor(utilities.length * 0.1)] ?? 0;

  const dayLoad = DAYS.map((day) => ({
    day,
    courses: COURSES.filter((course) => SLOT_MAP[assignment[course.id]]?.day === day).length,
  }));

  const typeDayFlags = Object.keys(TYPE_CONFIG)
    .map((type) => {
      const triggered = studentRows.some(
        (row) => row.type === type && row.maxClassesSingleDay > 3
      );
      return triggered ? `${TYPE_CONFIG[type].short} has 4+ desired courses stacked on one day` : null;
    })
    .filter(Boolean);

  const metrics = {
    surrogateScore,
    trueScore,
    components,
    trueComponents,
    fullCoverageRate,
    perType,
    histogram,
    p10,
    dayLoad,
    typeDayFlags,
    studentRows,
  };

  const violations = computeConstraintViolations(assignment, students, metrics, constraints);
  const penalty = violations.length * 100000;

  return {
    ...metrics,
    penalizedSurrogate: surrogateScore - penalty,
    violations,
  };
}

function solveTimetable({ students, weights, constraints, seed, restarts, iterations }) {
  let bestAssignment = createEmptyAssignment();
  let bestMetrics = evaluateAssignment(bestAssignment, students, weights, constraints);

  for (let restart = 0; restart < restarts; restart += 1) {
    const rng = createRng(seed + restart * 9973);
    const assignment = createEmptyAssignment();
    const slotLoads = getSlotLoads(assignment);
    const orderedCourses = [...COURSES].sort((left, right) => {
      const demandDelta = right.totalDemand - left.totalDemand;
      if (demandDelta !== 0) return demandDelta;
      return rng() > 0.5 ? 1 : -1;
    });

    orderedCourses.forEach((course) => {
      let bestLocalSlot = null;
      let bestLocalScore = -Infinity;

      TIMESLOTS.forEach((slot) => {
        if (slotLoads[slot.id] >= slot.capacity) return;
        const trialAssignment = { ...assignment, [course.id]: slot.id };
        const trialMetrics = evaluateAssignment(trialAssignment, students, weights, constraints);
        if (trialMetrics.penalizedSurrogate > bestLocalScore) {
          bestLocalScore = trialMetrics.penalizedSurrogate;
          bestLocalSlot = slot.id;
        }
      });

      if (!bestLocalSlot) {
        const fallback = TIMESLOTS.find((slot) => slotLoads[slot.id] < slot.capacity);
        bestLocalSlot = fallback?.id ?? null;
      }

      assignment[course.id] = bestLocalSlot;
      if (bestLocalSlot) slotLoads[bestLocalSlot] += 1;
    });

    let currentMetrics = evaluateAssignment(assignment, students, weights, constraints);
    let currentScore = currentMetrics.penalizedSurrogate;

    for (let step = 0; step < iterations; step += 1) {
      const nextAssignment = { ...assignment };
      const moveCourse = COURSES[Math.floor(rng() * COURSES.length)];

      if (rng() < 0.55) {
        const nextSlot = TIMESLOTS[Math.floor(rng() * TIMESLOTS.length)];
        const loads = getSlotLoads(nextAssignment);
        if (
          nextAssignment[moveCourse.id] === nextSlot.id ||
          loads[nextSlot.id] >= nextSlot.capacity
        ) {
          continue;
        }
        nextAssignment[moveCourse.id] = nextSlot.id;
      } else {
        const swapCourse = COURSES[Math.floor(rng() * COURSES.length)];
        if (swapCourse.id === moveCourse.id) continue;
        [nextAssignment[moveCourse.id], nextAssignment[swapCourse.id]] = [
          nextAssignment[swapCourse.id],
          nextAssignment[moveCourse.id],
        ];
      }

      const nextMetrics = evaluateAssignment(nextAssignment, students, weights, constraints);
      const nextScore = nextMetrics.penalizedSurrogate;

      if (nextScore > currentScore || rng() < 0.02) {
        Object.assign(assignment, nextAssignment);
        currentMetrics = nextMetrics;
        currentScore = nextScore;
      }
    }

    if (currentMetrics.penalizedSurrogate > bestMetrics.penalizedSurrogate) {
      bestAssignment = { ...assignment };
      bestMetrics = currentMetrics;
    }
  }

  return { assignment: bestAssignment, metrics: bestMetrics };
}

function panelStyle(extra = {}) {
  return {
    background: COLORS.panel,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    boxShadow: "0 14px 34px rgba(31, 41, 55, 0.06)",
    ...extra,
  };
}

function SectionCard({ title, children, action, style }) {
  return (
    <section style={panelStyle({ padding: 14, display: "grid", gap: 10, ...style })}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: COLORS.muted }}>
          {title}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SmallMetric({ label, value, accent }) {
  return (
    <div style={{ ...panelStyle({ padding: 12, minWidth: 0 }), borderColor: accent ?? COLORS.border }}>
      <div style={{ fontSize: 11, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function CourseChip({ course, dragging = false }) {
  const draggable = useDraggable({
    id: course.id,
    data: { type: "course", courseId: course.id },
  });

  const chipStyle = {
    transform: CSS.Translate.toString(draggable.transform),
    transition: draggable.transition,
    cursor: "grab",
    userSelect: "none",
    touchAction: "none",
    opacity: dragging || draggable.isDragging ? 0.45 : 1,
    padding: "8px 10px",
    borderRadius: 12,
    border: `1px solid ${getDemandColor(course.totalDemand)}`,
    background: `${getDemandColor(course.totalDemand)}18`,
    color: COLORS.text,
    display: "grid",
    gap: 2,
    fontSize: 11,
    lineHeight: 1.25,
  };

  return (
    <div ref={draggable.setNodeRef} style={chipStyle} {...draggable.listeners} {...draggable.attributes}>
      <strong>{course.id}</strong>
      <span>{course.name}</span>
      <span style={{ color: COLORS.muted }}>Demand {course.totalDemand}</span>
    </div>
  );
}

function DropZone({ id, title, subtitle, courses, load, isHolding, activeCourseId }) {
  const droppable = useDroppable({ id });
  const isActive = droppable.isOver;
  const overCapacity = !isHolding && load >= 3;

  return (
    <div
      ref={droppable.setNodeRef}
      style={{
        minHeight: isHolding ? 126 : 176,
        borderRadius: 16,
        border: `1px solid ${
          isActive ? (overCapacity ? COLORS.danger : COLORS.accent) : overCapacity ? COLORS.danger : COLORS.border
        }`,
        background: isActive ? (overCapacity ? "#fff1ef" : "#edf6f6") : "#ffffff",
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
        {!isHolding ? (
          <div style={{ fontSize: 11, color: overCapacity ? COLORS.danger : COLORS.muted }}>{load}/3</div>
        ) : null}
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {courses.map((course) => (
          <CourseChip key={course.id} course={course} dragging={activeCourseId === course.id} />
        ))}
        {courses.length === 0 ? (
          <div style={{ fontSize: 11, color: COLORS.muted, paddingTop: 12 }}>
            {isHolding ? "All courses assigned." : "Drop courses here"}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function App() {
  const [studentSeed, setStudentSeed] = useState(BASELINE_STUDENT_SEED);
  const [round, setRound] = useState(1);
  const [assignment, setAssignment] = useState(createEmptyAssignment);
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [constraints, setConstraints] = useState({ ...EMPTY_CONSTRAINTS });
  const [showUtilityModal, setShowUtilityModal] = useState(false);
  const [solverSeed, setSolverSeed] = useState(101);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [toast, setToast] = useState("");
  const [openNarrativeInterpretations, setOpenNarrativeInterpretations] = useState({});
  const [openBriefingInterpretations, setOpenBriefingInterpretations] = useState({});

  const students = useMemo(() => generateStudents(studentSeed), [studentSeed]);
  const currentMetrics = useMemo(
    () => evaluateAssignment(assignment, students, weights, constraints),
    [assignment, students, weights, constraints]
  );
  const optimalMetrics = useMemo(
    () => evaluateAssignment(PRECOMPUTED_OPTIMAL_ASSIGNMENT, students, TRUE_WEIGHTS, EMPTY_CONSTRAINTS),
    [students]
  );

  const optimalScore = optimalMetrics.trueScore;
  const percentOfOptimal = optimalScore === 0 ? 0 : (currentMetrics.trueScore / optimalScore) * 100;
  const optimalGap = optimalScore === 0 ? 0 : ((optimalScore - currentMetrics.trueScore) / optimalScore) * 100;
  const slotLoads = getSlotLoads(assignment);
  const courseLayout = useMemo(() => buildCoursesBySlot(assignment), [assignment]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function updateWeight(key, value) {
    setWeights((current) => ({ ...current, [key]: Number(value) }));
  }

  function updateConstraint(key, value) {
    setConstraints((current) => ({ ...current, [key]: value }));
  }

  function handleSolve(nextSeed = solverSeed, randomizeAfter = false) {
    const result = solveTimetable({
      students,
      weights,
      constraints,
      seed: nextSeed,
      restarts: 8,
      iterations: 5000,
    });
    setAssignment(result.assignment);
    setToast(
      result.metrics.violations.length === 0
        ? "Solver finished with a feasible timetable."
        : `Solver finished with ${result.metrics.violations.length} active constraint warnings.`
    );
    if (randomizeAfter) setSolverSeed((seed) => seed + 17);
  }

  function handleLoadOptimal() {
    setAssignment(PRECOMPUTED_OPTIMAL_ASSIGNMENT);
    setWeights({ ...TRUE_WEIGHTS });
    setToast(`Loaded saved optimal and true weights (F* = ${formatNumber(optimalScore)})`);
  }

  function handleReset() {
    setStudentSeed(BASELINE_STUDENT_SEED);
    setAssignment(createEmptyAssignment());
    setWeights(DEFAULT_WEIGHTS);
    setConstraints({ ...EMPTY_CONSTRAINTS });
    setOpenNarrativeInterpretations({});
    setOpenBriefingInterpretations({});
    setRound(1);
    setToast("Workbench reset to the baseline scenario.");
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

    const nextSlot = SLOT_MAP[targetId];
    if (!nextSlot) return;

    const currentSlot = assignment[courseId];
    const load = slotLoads[targetId];
    if (currentSlot !== targetId && load >= nextSlot.capacity) {
      setToast(`${nextSlot.label} is full.`);
      return;
    }

    setAssignment((current) => ({ ...current, [courseId]: targetId }));
  }

  const perTypeBars = Object.values(currentMetrics.perType).map((item) => ({
    name: item.type,
    label: TYPE_CONFIG[item.type].short,
    utility: item.count === 0 ? 0 : item.totalUtility / item.count,
    color: item.color,
  }));

  const activeCourse = activeCourseId ? COURSE_MAP[activeCourseId] : null;
  const toggleNarrativeInterpretation = (index) => {
    setOpenNarrativeInterpretations((current) => ({ ...current, [index]: !current[index] }));
  };
  const toggleBriefingInterpretation = (name) => {
    setOpenBriefingInterpretations((current) => ({ ...current, [name]: !current[name] }));
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(135deg, #f4f7f8 0%, ${COLORS.bg} 55%, #eef2f3 100%)`,
        color: COLORS.text,
        padding: 16,
      }}
    >
      <div style={{ display: "grid", gap: 14, maxWidth: 1720, minWidth: 1600, margin: "0 auto" }}>
        <header
          style={{
            ...panelStyle({
              padding: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }),
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Experimenter Workbench
            </div>
            <h1 style={{ margin: "4px 0 0", fontSize: 28 }}>Timetable Experiment Workbench</h1>
          </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 12, background: COLORS.accentSoft }}>
                <span style={{ fontSize: 12, color: COLORS.muted }}>Round</span>
                <button className="app-button ghost" onClick={() => setRound((value) => Math.max(1, value - 1))}>-</button>
                <strong>{round}</strong>
                <button className="app-button ghost" onClick={() => setRound((value) => value + 1)}>+</button>
              </div>
            <button className="app-button secondary" onClick={() => setShowUtilityModal(true)}>
              Show True Utility
            </button>
            <button className="app-button secondary" onClick={handleReset}>
              Reset
            </button>
          </div>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "280px minmax(860px, 1fr) 540px", gap: 14, alignItems: "stretch" }}>
          <aside style={{ display: "grid", gap: 14, height: "calc(100vh - 210px)", overflow: "auto", paddingRight: 2, alignContent: "start" }}>
            <SectionCard
              title="Student Voices"
            >
              {STUDENT_NARRATIVES.map((entry, index) => (
                <div
                  key={`${entry.type}-${index}`}
                  style={{
                    borderLeft: `4px solid ${TYPE_CONFIG[entry.type].color}`,
                    borderRadius: 12,
                    background: "#fbfcfd",
                    padding: 12,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#fff",
                        background: TYPE_CONFIG[entry.type].color,
                      }}
                    >
                      {TYPE_CONFIG[entry.type].icon}
                    </span>
                    <strong style={{ fontSize: 12 }}>{TYPE_CONFIG[entry.type].label}</strong>
                  </div>
                  <div style={{ fontSize: 12, color: COLORS.text, lineHeight: 1.45 }}>{entry.text}</div>
                  <button className="app-button secondary" onClick={() => toggleNarrativeInterpretation(index)}>
                    {openNarrativeInterpretations[index] ? "Hide Interpretation" : "Show Intended Interpretation"}
                  </button>
                  {openNarrativeInterpretations[index] ? (
                    <div style={{ fontSize: 12, lineHeight: 1.45, color: COLORS.accent, background: "#f3f7f8", borderRadius: 10, padding: 10 }}>
                      {entry.interpretation}
                    </div>
                  ) : null}
                </div>
              ))}
            </SectionCard>

            <SectionCard
              title="Stakeholder Briefings"
            >
              {STAKEHOLDER_BRIEFINGS.map((entry) => (
                <div key={entry.name} style={{ borderRadius: 12, border: `1px solid ${COLORS.border}`, padding: 12, display: "grid", gap: 6 }}>
                  <div>
                    <strong style={{ fontSize: 12 }}>{entry.name}</strong>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>{entry.role}</div>
                  </div>
                  <div style={{ fontSize: 12, lineHeight: 1.45 }}>{entry.text}</div>
                  <button className="app-button secondary" onClick={() => toggleBriefingInterpretation(entry.name)}>
                    {openBriefingInterpretations[entry.name] ? "Hide Interpretation" : "Show Intended Interpretation"}
                  </button>
                  {openBriefingInterpretations[entry.name] ? (
                    <div style={{ fontSize: 12, lineHeight: 1.45, color: COLORS.accent, background: "#f3f7f8", borderRadius: 10, padding: 10 }}>
                      {entry.interpretation}
                    </div>
                  ) : null}
                </div>
              ))}
            </SectionCard>
          </aside>

          <main style={{ display: "grid", gap: 14 }}>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <section style={panelStyle({ padding: 16, display: "grid", gap: 14 })}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Timetable Grid
                    </div>
                    <div style={{ fontSize: 13, color: COLORS.text }}>Drag courses between day/block cells. Metrics update immediately.</div>
                  </div>
                  <div style={{ fontSize: 12, color: currentMetrics.violations.length ? COLORS.danger : COLORS.success }}>
                    {currentMetrics.violations.length
                      ? `${currentMetrics.violations.length} active warnings`
                      : "All active constraints satisfied"}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(152px, 1fr))", gap: 12 }}>
                  {DAYS.map((day, dayIndex) => (
                    <div key={day} style={{ display: "grid", gap: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{day}</div>
                      {["AM", "PM"].map((block) => {
                        const slot = TIMESLOTS[dayIndex * 2 + (block === "AM" ? 0 : 1)];
                        return (
                          <DropZone
                            key={slot.id}
                            id={slot.id}
                            title={slot.label}
                            subtitle={block === "AM" ? "Morning block" : "Afternoon block"}
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
                  subtitle="Drag to schedule"
                  courses={courseLayout.unassigned}
                  load={courseLayout.unassigned.length}
                  isHolding
                  activeCourseId={activeCourseId}
                />
              </section>

              <DragOverlay>{activeCourse ? <CourseChip course={activeCourse} dragging /> : null}</DragOverlay>
            </DndContext>
          </main>

          <aside style={{ display: "grid", height: "calc(100vh - 210px)", overflow: "auto", paddingRight: 2, alignContent: "start" }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 240px)", gap: 14, alignItems: "start" }}>
              <SectionCard title="Metrics Dashboard">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button className="app-button primary" onClick={() => handleSolve(solverSeed, false)}>
                  Solve with Current Settings
                </button>
                <button className="app-button secondary" onClick={handleLoadOptimal}>
                  Load Saved Optimal
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <SmallMetric label="Current F(x)" value={formatNumber(currentMetrics.trueScore)} accent={COLORS.accent} />
                <SmallMetric label="% of Optimal" value={`${formatNumber(percentOfOptimal)}%`} accent={COLORS.success} />
              </div>

              <div style={{ height: 170 }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Per-Type Satisfaction</div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perTypeBars} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf0f2" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="label" width={72} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatNumber(value)} />
                    <Bar dataKey="utility" radius={[0, 8, 8, 0]}>
                      {perTypeBars.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Coverage Rate</div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{formatNumber(currentMetrics.fullCoverageRate * 100)}%</div>
                {Object.values(currentMetrics.perType).map((entry) => (
                  <div key={entry.type} style={{ display: "grid", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span>{TYPE_CONFIG[entry.type].label}</span>
                      <span>{formatNumber((entry.fullyCovered / entry.count) * 100)}%</span>
                    </div>
                    <div style={{ height: 8, background: "#edf0f2", borderRadius: 999 }}>
                      <div
                        style={{
                          width: `${(entry.fullyCovered / entry.count) * 100}%`,
                          height: "100%",
                          borderRadius: 999,
                          background: TYPE_CONFIG[entry.type].color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Gap Distribution</div>
                {Object.values(currentMetrics.perType).map((entry) => (
                  <div key={`${entry.type}-gaps`} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>{TYPE_CONFIG[entry.type].short}</span>
                    <span>{formatNumber((entry.highGapCount / entry.count) * 100)}% with 2+ gap slots</span>
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>Day Load Distribution</div>
                {currentMetrics.dayLoad.map((entry) => (
                  <div key={entry.day} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span>{entry.day}</span>
                    <span>{entry.courses} courses</span>
                  </div>
                ))}
                {currentMetrics.typeDayFlags.length > 0 ? (
                  <div style={{ color: COLORS.warning, fontSize: 11 }}>{currentMetrics.typeDayFlags.join(" | ")}</div>
                ) : null}
              </div>

              <div style={{ height: 150 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12, fontWeight: 700 }}>
                  <span>Satisfaction Histogram</span>
                  <span style={{ color: COLORS.muted }}>10th pct: {formatNumber(currentMetrics.p10)}</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentMetrics.histogram} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#edf0f2" />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => value} />
                    <Bar dataKey="count" fill={COLORS.accent} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              </SectionCard>

              <SectionCard title="Solver Controls">
                {[
                  ["coverage", "w_coverage"],
                  ["timePenalty", "w_time_penalty"],
                  ["gapPenalty", "w_gap_penalty"],
                  ["patternPenalty", "w_pattern_penalty"],
                  ["fridayBonus", "w_friday_bonus"],
                ].map(([key, label]) => (
                  <label key={key} style={{ display: "grid", gap: 4 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span>{label}</span>
                      <strong>{weights[key]}</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      step="0.5"
                      value={weights[key]}
                      onChange={(event) => updateWeight(key, event.target.value)}
                    />
                  </label>
                ))}

                <div style={{ fontSize: 12, fontWeight: 700, marginTop: 8 }}>Constraint Toggles</div>

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={constraints.maxAfternoonEnabled}
                    onChange={(event) => updateConstraint("maxAfternoonEnabled", event.target.checked)}
                  />
                  <span>Max afternoon classes for working students</span>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={constraints.maxAfternoonValue}
                    onChange={(event) => updateConstraint("maxAfternoonValue", event.target.value)}
                  />
                </label>

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={constraints.maxCoursesPerTypeEnabled}
                    onChange={(event) => updateConstraint("maxCoursesPerTypeEnabled", event.target.checked)}
                  />
                  <span>Max courses per timeslot for any type</span>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={constraints.maxCoursesPerTypeValue}
                    onChange={(event) => updateConstraint("maxCoursesPerTypeValue", event.target.value)}
                  />
                </label>

                <label className="check-row compact">
                  <input
                    type="checkbox"
                    checked={constraints.noAthleteMwfMorning}
                    onChange={(event) => updateConstraint("noAthleteMwfMorning", event.target.checked)}
                  />
                  <span>No MWF morning classes for athletes</span>
                </label>

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={constraints.minCoverageEnabled}
                    onChange={(event) => updateConstraint("minCoverageEnabled", event.target.checked)}
                  />
                  <span>Min coverage rate</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={constraints.minCoverageValue}
                    onChange={(event) => updateConstraint("minCoverageValue", event.target.value)}
                  />
                </label>

                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={constraints.maxGapEnabled}
                    onChange={(event) => updateConstraint("maxGapEnabled", event.target.checked)}
                  />
                  <span>Max gap length (slots)</span>
                  <input
                    type="number"
                    min="0"
                    max="4"
                    value={constraints.maxGapValue}
                    onChange={(event) => updateConstraint("maxGapValue", event.target.value)}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={{ fontSize: 11 }}>Custom constraint text</span>
                  <textarea
                    value={constraints.customConstraintText}
                    onChange={(event) => updateConstraint("customConstraintText", event.target.value)}
                    rows={3}
                    style={{ resize: "vertical" }}
                  />
                </label>

                <button className="app-button primary" onClick={() => handleSolve(solverSeed, false)}>
                  Solve with Current Settings
                </button>
                <button className="app-button secondary" onClick={() => handleSolve(solverSeed + 31, true)}>
                  Re-solve (keep constraints, randomize)
                </button>

                {currentMetrics.violations.length > 0 ? (
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
          style={{
            ...panelStyle({
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              fontSize: 13,
            }),
          }}
        >
          <span>Current F(x) = {formatNumber(currentMetrics.trueScore)}</span>
          <span>Optimal F(x*) = {formatNumber(optimalScore)}</span>
          <span>Gap to optimal = {formatNumber(optimalGap)}%</span>
          <span>Round {round}</span>
        </footer>
      </div>

      {toast ? (
        <div
          style={{
            position: "fixed",
            right: 18,
            top: 18,
            background: COLORS.accent,
            color: "#fff",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 12,
            boxShadow: "0 14px 30px rgba(38, 70, 83, 0.26)",
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
            style={{
              ...panelStyle({
                width: "min(920px, 100%)",
                maxHeight: "85vh",
                overflow: "auto",
                padding: 18,
                display: "grid",
                gap: 14,
              }),
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
              <div>
                <div style={{ fontSize: 12, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Hidden Objective
                </div>
                <h2 style={{ margin: "4px 0 0", fontSize: 24 }}>True Utility Function</h2>
              </div>
              <button className="app-button secondary" onClick={() => setShowUtilityModal(false)}>
                Close
              </button>
            </div>

            <div style={{ ...panelStyle({ padding: 14, background: "#fbfcfd" }) }}>
              <code style={{ fontSize: 13 }}>
                U_s(x) = 10 * coverage - 2.5 * time_penalty - 3.0 * gap_penalty - 1.5 * pattern_penalty + 1.0 * friday_bonus
              </code>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14 }}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                  Coverage counts non-conflicting desired courses. Time penalties follow each type profile. Gap burden counts edge idle time on days with only one scheduled block, weighted 1.5x before the first class and 0.5x after the last class, then scaled by student gap sensitivity.
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.55 }}>
                  Pattern penalties: commuters minimize days on campus, first-years avoid stacking more than three desired courses on one day, graduate students pay for class days beyond two. Friday with no scheduled desired courses earns a +1 hidden bonus.
                </div>
              </div>

              <div style={{ ...panelStyle({ padding: 12, background: "#fbfcfd" }) }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Per-Type Preference Profiles</div>
                {Object.entries(TYPE_CONFIG).map(([type, config]) => (
                  <div key={type} style={{ fontSize: 11, marginBottom: 6 }}>
                    <strong>{config.label}</strong>: time={config.timeMode}, gapSensitivity={config.gapSensitivity}, pattern={config.patternType}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ ...panelStyle({ padding: 12 }) }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Current Timetable Breakdown</div>
                {Object.entries(currentMetrics.trueComponents).map(([key, value]) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span>{key}</span>
                    <span>{formatNumber(value)}</span>
                  </div>
                ))}
              </div>
              <div style={{ ...panelStyle({ padding: 12 }) }}>
                <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Optimal Timetable Breakdown</div>
                {Object.entries(optimalMetrics.trueComponents).map(([key, value]) => (
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
    </div>
  );
}

export default App;
