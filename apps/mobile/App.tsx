import React, {useMemo, useState} from 'react';
import {
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

type RaceDistance = '10k' | 'half_marathon';
type Weekday = {
  iso: number;
  short: string;
  label: string;
};
type PreviewWorkout = {
  day: string;
  type: string;
  distance: string;
  intensity: string;
};
type BootstrapUserResponse = {
  data: {
    id: number;
  };
};
type TrainingPlanResponse = {
  data: SavedTrainingPlan;
};
type TrainingPlansResponse = {
  data: SavedTrainingPlan[];
};
type SavedTrainingPlan = {
  id: number;
  level: string;
  starts_on: string;
  ends_on: string;
  race_goal: {
    race_distance: RaceDistance;
    race_date: string;
  };
  workouts: SavedWorkout[];
  revisions: {
    id: number;
    reason: string;
    summary: string;
  }[];
};
type SavedWorkout = {
  id: number;
  week_number: number;
  scheduled_on: string;
  type: string;
  status: string;
  target_distance_km: number | null;
  target_intensity: string | null;
  note: string | null;
};

const apiBaseUrl = 'http://localhost:8010/api/v1';

const weekdays: Weekday[] = [
  {iso: 1, short: 'M', label: 'Mon'},
  {iso: 2, short: 'T', label: 'Tue'},
  {iso: 3, short: 'W', label: 'Wed'},
  {iso: 4, short: 'T', label: 'Thu'},
  {iso: 5, short: 'F', label: 'Fri'},
  {iso: 6, short: 'S', label: 'Sat'},
  {iso: 7, short: 'S', label: 'Sun'},
];

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <PlannerScreen />
    </SafeAreaProvider>
  );
}

function PlannerScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const [raceDistance, setRaceDistance] = useState<RaceDistance>('10k');
  const [raceDate, setRaceDate] = useState('2026-08-23');
  const [isRaceCalendarOpen, setIsRaceCalendarOpen] = useState(false);
  const [weeklyKm, setWeeklyKm] = useState('24');
  const [selectedDays, setSelectedDays] = useState([2, 4, 6]);
  const [longRunDay, setLongRunDay] = useState(6);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedPlanId, setSavedPlanId] = useState<number | null>(null);
  const [localUserId, setLocalUserId] = useState<number | null>(null);
  const [savedPlan, setSavedPlan] = useState<SavedTrainingPlan | null>(null);
  const [isLoadingSavedPlan, setIsLoadingSavedPlan] = useState(false);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);

  const preview = useMemo(
    () => buildPreview(raceDistance, Number(weeklyKm) || 0, selectedDays, longRunDay),
    [longRunDay, raceDistance, selectedDays, weeklyKm],
  );

  function toggleDay(day: number) {
    setSelectedDays(current => {
      if (current.includes(day)) {
        const next = current.filter(value => value !== day);

        if (longRunDay === day && next.length > 0) {
          setLongRunDay(next[next.length - 1]);
        }

        return next.length > 0 ? next : current;
      }

      return [...current, day].sort((a, b) => a - b);
    });
  }

  async function savePlan() {
    setIsSavingPlan(true);
    setSaveMessage(null);
    setLoadMessage(null);

    try {
      const user = await bootstrapLocalUser();
      const plan = await requestJson<TrainingPlanResponse>('/training-plans', {
        method: 'POST',
        body: JSON.stringify({
          user_id: user.data.id,
          race_distance: raceDistance,
          start_date: todayDateString(),
          race_date: raceDate,
          available_weekdays: selectedDays,
          long_run_weekday: longRunDay,
          current_weekly_distance_km: Number(weeklyKm) || 0,
          level: 'beginner',
        }),
      });
      const savedPlanResult = await requestJson<TrainingPlanResponse>(
        `/training-plans/${plan.data.id}?user_id=${user.data.id}`,
        {method: 'GET'},
      );

      setLocalUserId(user.data.id);
      setSavedPlanId(plan.data.id);
      setSavedPlan(savedPlanResult.data);
      setSaveMessage(`Saved plan ${plan.data.id} with ${plan.data.workouts.length} workouts.`);
    } catch (error) {
      setSavedPlanId(null);
      setSavedPlan(null);
      setSaveMessage(error instanceof Error ? error.message : 'Could not save the plan.');
    } finally {
      setIsSavingPlan(false);
    }
  }

  async function loadLatestPlan() {
    setIsLoadingSavedPlan(true);
    setLoadMessage(null);
    setSaveMessage(null);

    try {
      const user = await bootstrapLocalUser();
      const plans = await requestJson<TrainingPlansResponse>(`/training-plans?user_id=${user.data.id}`, {
        method: 'GET',
      });

      if (plans.data.length === 0) {
        setLocalUserId(user.data.id);
        setSavedPlanId(null);
        setSavedPlan(null);
        setLoadMessage('No saved plans yet.');

        return;
      }

      setLocalUserId(user.data.id);
      setSavedPlanId(plans.data[0].id);
      setSavedPlan(plans.data[0]);
      setLoadMessage(`Loaded plan ${plans.data[0].id} with ${plans.data[0].workouts.length} workouts.`);
    } catch (error) {
      setLoadMessage(error instanceof Error ? error.message : 'Could not load saved plans.');
    } finally {
      setIsLoadingSavedPlan(false);
    }
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {paddingTop: safeAreaInsets.top + 20, paddingBottom: safeAreaInsets.bottom + 32},
      ]}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Running Trainer</Text>
        <Text style={styles.title}>
          {raceDistance === '10k' ? '10K' : 'Half marathon'} plan
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={isLoadingSavedPlan}
          onPress={loadLatestPlan}
          style={[styles.secondaryButton, isLoadingSavedPlan && styles.secondaryButtonDisabled]}>
          <Text style={styles.secondaryButtonText}>
            {isLoadingSavedPlan ? 'Loading...' : 'Load latest plan'}
          </Text>
        </Pressable>
        {loadMessage ? (
          <Text style={[styles.saveMessage, savedPlan ? styles.saveMessageSuccess : styles.saveMessageError]}>
            {loadMessage}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Goal</Text>
        <View style={styles.segmentedControl}>
          <SegmentButton
            label="10K"
            selected={raceDistance === '10k'}
            onPress={() => setRaceDistance('10k')}
          />
          <SegmentButton
            label="Half"
            selected={raceDistance === 'half_marathon'}
            onPress={() => setRaceDistance('half_marathon')}
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={styles.field}>
            <Text style={styles.label}>Race date</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Choose race date"
              accessibilityState={{expanded: isRaceCalendarOpen}}
              onPress={() => setIsRaceCalendarOpen(current => !current)}
              style={styles.dateButton}>
              <Text style={styles.dateButtonText}>{formatReadableDate(raceDate)}</Text>
              <Text style={styles.dateButtonIcon}>v</Text>
            </Pressable>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Weekly km</Text>
            <TextInput
              value={weeklyKm}
              onChangeText={setWeeklyKm}
              style={styles.input}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {isRaceCalendarOpen ? (
          <RaceDateCalendar
            selectedDate={raceDate}
            onSelect={date => {
              setRaceDate(date);
              setIsRaceCalendarOpen(false);
            }}
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Training days</Text>
        <View style={styles.dayGrid}>
          {weekdays.map(day => (
            <Pressable
              key={day.iso}
              accessibilityRole="button"
              accessibilityState={{selected: selectedDays.includes(day.iso)}}
              onPress={() => toggleDay(day.iso)}
              style={[
                styles.dayButton,
                selectedDays.includes(day.iso) && styles.dayButtonSelected,
              ]}>
              <Text
                style={[
                  styles.dayShort,
                  selectedDays.includes(day.iso) && styles.dayShortSelected,
                ]}>
                {day.short}
              </Text>
              <Text
                style={[
                  styles.dayLabel,
                  selectedDays.includes(day.iso) && styles.dayLabelSelected,
                ]}>
                {day.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Long run</Text>
        <View style={styles.longRunRow}>
          {weekdays
            .filter(day => selectedDays.includes(day.iso))
            .map(day => (
              <Pressable
                key={day.iso}
                accessibilityRole="button"
                accessibilityState={{selected: longRunDay === day.iso}}
                onPress={() => setLongRunDay(day.iso)}
                style={[
                  styles.longRunButton,
                  longRunDay === day.iso && styles.longRunButtonSelected,
                ]}>
                <Text
                  style={[
                    styles.longRunText,
                    longRunDay === day.iso && styles.longRunTextSelected,
                  ]}>
                  {day.label}
                </Text>
              </Pressable>
            ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.previewHeader}>
          <View>
            <Text style={styles.sectionTitle}>Week preview</Text>
            <Text style={styles.subtle}>{preview.target} km target</Text>
          </View>
          <Text style={styles.raceDate}>{raceDate}</Text>
        </View>

        <View style={styles.workoutList}>
          {preview.workouts.map(workout => (
            <View key={`${workout.day}-${workout.type}`} style={styles.workoutRow}>
              <View style={styles.workoutDay}>
                <Text style={styles.workoutDayText}>{workout.day}</Text>
              </View>
              <View style={styles.workoutMain}>
                <Text style={styles.workoutType}>{workout.type}</Text>
                <Text style={styles.workoutMeta}>{workout.intensity}</Text>
              </View>
              <Text style={styles.workoutDistance}>{workout.distance}</Text>
            </View>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isSavingPlan}
          onPress={savePlan}
          style={[styles.primaryButton, isSavingPlan && styles.primaryButtonDisabled]}>
          <Text style={styles.primaryButtonText}>
            {isSavingPlan ? 'Saving...' : savedPlanId ? 'Save again' : 'Save plan'}
          </Text>
        </Pressable>

        {saveMessage ? (
          <Text style={[styles.saveMessage, savedPlanId ? styles.saveMessageSuccess : styles.saveMessageError]}>
            {saveMessage}
          </Text>
        ) : null}
      </View>

      {savedPlan ? (
        <SavedPlanSection plan={savedPlan} userId={localUserId} />
      ) : null}

      <View style={styles.logPanel}>
        <Text style={styles.sectionTitle}>Quick log</Text>
        <View style={styles.fieldRow}>
          <View style={styles.field}>
            <Text style={styles.label}>Distance</Text>
            <TextInput value="" placeholder="km" style={styles.input} keyboardType="decimal-pad" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Effort</Text>
            <TextInput value="" placeholder="RPE" style={styles.input} keyboardType="number-pad" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

function SavedPlanSection({plan, userId}: {plan: SavedTrainingPlan; userId: number | null}) {
  const upcomingWorkouts = plan.workouts.slice(0, 12);

  return (
    <View style={styles.section}>
      <View style={styles.previewHeader}>
        <View>
          <Text style={styles.sectionTitle}>Saved plan</Text>
          <Text style={styles.subtle}>
            {formatRaceDistance(plan.race_goal.race_distance)} · {plan.workouts.length} workouts
          </Text>
        </View>
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>#{plan.id}</Text>
        </View>
      </View>

      <View style={styles.planMetaRow}>
        <Text style={styles.planMetaText}>{plan.starts_on}</Text>
        <Text style={styles.planMetaText}>{plan.ends_on}</Text>
        {userId ? <Text style={styles.planMetaText}>User {userId}</Text> : null}
      </View>

      <View style={styles.workoutList}>
        {upcomingWorkouts.map(workout => (
          <View key={workout.id} style={styles.savedWorkoutRow}>
            <View style={styles.savedWorkoutDate}>
              <Text style={styles.savedWorkoutMonth}>{formatMonth(workout.scheduled_on)}</Text>
              <Text style={styles.savedWorkoutDay}>{formatDay(workout.scheduled_on)}</Text>
            </View>
            <View style={styles.workoutMain}>
              <View style={styles.savedWorkoutTitleRow}>
                <Text style={styles.workoutType}>{formatWorkoutType(workout.type)}</Text>
                <Text style={styles.statusPill}>{workout.status}</Text>
              </View>
              <Text style={styles.workoutMeta}>
                Week {workout.week_number}
                {workout.target_intensity ? ` · ${formatIntensity(workout.target_intensity)}` : ''}
              </Text>
            </View>
            <Text style={styles.workoutDistance}>
              {workout.target_distance_km ? `${workout.target_distance_km.toFixed(1)} km` : '-'}
            </Text>
          </View>
        ))}
      </View>

      {plan.revisions[0] ? (
        <Text style={styles.revisionText}>{plan.revisions[0].summary}</Text>
      ) : null}
    </View>
  );
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message ?? `Request failed with status ${response.status}.`);
  }

  return payload as T;
}

async function bootstrapLocalUser(): Promise<BootstrapUserResponse> {
  return requestJson<BootstrapUserResponse>('/athlete-bootstrap', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Local Runner',
      email: 'local-runner@running-trainer.test',
    }),
  });
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function buildCalendarCells(monthDate: Date): {dateString: string; day: number; isCurrentMonth: boolean}[] {
  const firstDay = startOfMonth(monthDate);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({length: 42}, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);

    return {
      dateString: toDateString(date),
      day: date.getDate(),
      isCurrentMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function formatReadableDate(dateString: string): string {
  return parseDateString(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRaceDistance(distance: RaceDistance): string {
  return distance === '10k' ? '10K' : 'Half marathon';
}

function formatWorkoutType(type: string): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatIntensity(intensity: string): string {
  return intensity.replace('_', ' ');
}

function formatMonth(dateString: string): string {
  return new Date(`${dateString}T12:00:00`).toLocaleString('en-US', {month: 'short'});
}

function formatDay(dateString: string): string {
  return new Date(`${dateString}T12:00:00`).toLocaleString('en-US', {day: '2-digit'});
}

function SegmentButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{selected}}
      onPress={onPress}
      style={[styles.segmentButton, selected && styles.segmentButtonSelected]}>
      <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function RaceDateCalendar({
  selectedDate,
  onSelect,
}: {
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(parseDateString(selectedDate)));
  const calendarCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);

  return (
    <View style={styles.calendar}>
      <View style={styles.calendarHeader}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          onPress={() => setVisibleMonth(current => addMonths(current, -1))}
          style={styles.calendarNavButton}>
          <Text style={styles.calendarNavText}>{"<"}</Text>
        </Pressable>
        <Text style={styles.calendarTitle}>
          {visibleMonth.toLocaleString('en-US', {month: 'long', year: 'numeric'})}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next month"
          onPress={() => setVisibleMonth(current => addMonths(current, 1))}
          style={styles.calendarNavButton}>
          <Text style={styles.calendarNavText}>{">"}</Text>
        </Pressable>
      </View>

      <View style={styles.calendarWeekdayRow}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
          <Text key={`${day}-${index}`} style={styles.calendarWeekday}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {calendarCells.map(cell => {
          const isSelected = cell.dateString === selectedDate;

          return (
            <Pressable
              key={cell.dateString}
              accessibilityRole="button"
              accessibilityLabel={`Select ${formatReadableDate(cell.dateString)}`}
              accessibilityState={{selected: isSelected, disabled: !cell.isCurrentMonth}}
              disabled={!cell.isCurrentMonth}
              onPress={() => onSelect(cell.dateString)}
              style={[
                styles.calendarDay,
                !cell.isCurrentMonth && styles.calendarDayMuted,
                isSelected && styles.calendarDaySelected,
              ]}>
              <Text
                style={[
                  styles.calendarDayText,
                  !cell.isCurrentMonth && styles.calendarDayTextMuted,
                  isSelected && styles.calendarDayTextSelected,
                ]}>
                {cell.day}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function buildPreview(
  raceDistance: RaceDistance,
  weeklyKm: number,
  selectedDays: number[],
  longRunDay: number,
): {target: string; workouts: PreviewWorkout[]} {
  const target = Math.max(weeklyKm, raceDistance === '10k' ? 18 : 28);
  const longRunKm = Math.min(raceDistance === '10k' ? 10 : 16, Math.max(6, target * 0.35));
  const qualityKm = selectedDays.length >= 3 ? Math.max(5, target * 0.22) : 0;
  const easyCount = Math.max(1, selectedDays.length - (qualityKm > 0 ? 2 : 1));
  const easyKm = Math.max(3, (target - longRunKm - qualityKm) / easyCount);
  const qualityDay = selectedDays.find(day => Math.abs(day - longRunDay) >= 2);

  const workouts = selectedDays.map(day => {
    const weekday = weekdays.find(value => value.iso === day)?.label ?? 'Run';

    if (day === longRunDay) {
      return {
        day: weekday,
        type: 'Long run',
        distance: `${longRunKm.toFixed(1)} km`,
        intensity: 'Easy',
      };
    }

    if (day === qualityDay) {
      return {
        day: weekday,
        type: raceDistance === '10k' ? 'Intervals' : 'Tempo',
        distance: `${qualityKm.toFixed(1)} km`,
        intensity: raceDistance === '10k' ? 'Hard' : 'Moderate hard',
      };
    }

    return {
      day: weekday,
      type: 'Easy run',
      distance: `${easyKm.toFixed(1)} km`,
      intensity: 'Conversational',
    };
  });

  return {
    target: target.toFixed(1),
    workouts,
  };
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F7F3',
  },
  content: {
    paddingHorizontal: 18,
    gap: 14,
  },
  header: {
    gap: 6,
  },
  kicker: {
    color: '#68736E',
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    color: '#15211D',
    fontSize: 32,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8EEE9',
    borderColor: '#C9D1CB',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryButtonDisabled: {
    backgroundColor: '#F0F3EF',
  },
  secondaryButtonText: {
    color: '#1E5C4D',
    fontSize: 14,
    fontWeight: '800',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE3DC',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  sectionTitle: {
    color: '#15211D',
    fontSize: 17,
    fontWeight: '700',
  },
  segmentedControl: {
    backgroundColor: '#E8EEE9',
    borderRadius: 8,
    flexDirection: 'row',
    padding: 3,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    paddingVertical: 10,
  },
  segmentButtonSelected: {
    backgroundColor: '#1E5C4D',
  },
  segmentText: {
    color: '#41504A',
    fontSize: 15,
    fontWeight: '700',
  },
  segmentTextSelected: {
    color: '#FFFFFF',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 10,
  },
  field: {
    flex: 1,
    gap: 6,
  },
  label: {
    color: '#52615A',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D1CB',
    borderRadius: 8,
    borderWidth: 1,
    color: '#15211D',
    fontSize: 16,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  dateButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D1CB',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 12,
  },
  dateButtonText: {
    color: '#15211D',
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  dateButtonIcon: {
    color: '#1E5C4D',
    fontSize: 14,
    fontWeight: '900',
  },
  calendar: {
    backgroundColor: '#F6F7F3',
    borderColor: '#DDE3DC',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 10,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarNavButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D1CB',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    width: 40,
  },
  calendarNavText: {
    color: '#1E5C4D',
    fontSize: 18,
    fontWeight: '900',
  },
  calendarTitle: {
    color: '#15211D',
    fontSize: 16,
    fontWeight: '800',
  },
  calendarWeekdayRow: {
    flexDirection: 'row',
  },
  calendarWeekday: {
    color: '#68736E',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    width: '14.285%',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 5,
  },
  calendarDay: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 38,
    width: '14.285%',
  },
  calendarDayMuted: {
    opacity: 0.35,
  },
  calendarDaySelected: {
    backgroundColor: '#1E5C4D',
    borderColor: '#1E5C4D',
  },
  calendarDayText: {
    color: '#15211D',
    fontSize: 14,
    fontWeight: '800',
  },
  calendarDayTextMuted: {
    color: '#68736E',
  },
  calendarDayTextSelected: {
    color: '#FFFFFF',
  },
  dayGrid: {
    flexDirection: 'row',
    gap: 7,
  },
  dayButton: {
    alignItems: 'center',
    borderColor: '#C9D1CB',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minHeight: 58,
    justifyContent: 'center',
  },
  dayButtonSelected: {
    backgroundColor: '#D8E7DD',
    borderColor: '#1E5C4D',
  },
  dayShort: {
    color: '#15211D',
    fontSize: 16,
    fontWeight: '800',
  },
  dayShortSelected: {
    color: '#1E5C4D',
  },
  dayLabel: {
    color: '#68736E',
    fontSize: 11,
    fontWeight: '600',
  },
  dayLabelSelected: {
    color: '#1E5C4D',
  },
  longRunRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  longRunButton: {
    borderColor: '#C9D1CB',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  longRunButtonSelected: {
    backgroundColor: '#C9493A',
    borderColor: '#C9493A',
  },
  longRunText: {
    color: '#41504A',
    fontSize: 14,
    fontWeight: '700',
  },
  longRunTextSelected: {
    color: '#FFFFFF',
  },
  previewHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  subtle: {
    color: '#68736E',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  raceDate: {
    color: '#C9493A',
    fontSize: 14,
    fontWeight: '800',
  },
  workoutList: {
    gap: 8,
  },
  workoutRow: {
    alignItems: 'center',
    backgroundColor: '#F6F7F3',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    minHeight: 64,
    padding: 10,
  },
  workoutDay: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 42,
    width: 50,
  },
  workoutDayText: {
    color: '#1E5C4D',
    fontSize: 13,
    fontWeight: '800',
  },
  workoutMain: {
    flex: 1,
    gap: 3,
  },
  workoutType: {
    color: '#15211D',
    fontSize: 16,
    fontWeight: '800',
  },
  workoutMeta: {
    color: '#68736E',
    fontSize: 13,
    fontWeight: '600',
  },
  workoutDistance: {
    color: '#15211D',
    fontSize: 15,
    fontWeight: '800',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1E5C4D',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButtonDisabled: {
    backgroundColor: '#8BA39A',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  saveMessage: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  saveMessageSuccess: {
    color: '#1E5C4D',
  },
  saveMessageError: {
    color: '#B33A2E',
  },
  planBadge: {
    alignItems: 'center',
    backgroundColor: '#E8EEE9',
    borderRadius: 8,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  planBadgeText: {
    color: '#1E5C4D',
    fontSize: 13,
    fontWeight: '800',
  },
  planMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  planMetaText: {
    backgroundColor: '#F6F7F3',
    borderRadius: 8,
    color: '#52615A',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  savedWorkoutRow: {
    alignItems: 'center',
    backgroundColor: '#F6F7F3',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 12,
    minHeight: 70,
    padding: 10,
  },
  savedWorkoutDate: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
    width: 50,
  },
  savedWorkoutMonth: {
    color: '#68736E',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  savedWorkoutDay: {
    color: '#1E5C4D',
    fontSize: 17,
    fontWeight: '900',
  },
  savedWorkoutTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  statusPill: {
    backgroundColor: '#E8EEE9',
    borderRadius: 8,
    color: '#52615A',
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    textTransform: 'uppercase',
  },
  revisionText: {
    color: '#52615A',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  logPanel: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DDE3DC',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
});

export default App;
