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
  data: {
    id: number;
    workouts: unknown[];
  };
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
  const [weeklyKm, setWeeklyKm] = useState('24');
  const [selectedDays, setSelectedDays] = useState([2, 4, 6]);
  const [longRunDay, setLongRunDay] = useState(6);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [savedPlanId, setSavedPlanId] = useState<number | null>(null);

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

    try {
      const user = await requestJson<BootstrapUserResponse>('/athlete-bootstrap', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Local Runner',
          email: 'local-runner@running-trainer.test',
        }),
      });
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

      setSavedPlanId(plan.data.id);
      setSaveMessage(`Saved plan ${plan.data.id} with ${plan.data.workouts.length} workouts.`);
    } catch (error) {
      setSavedPlanId(null);
      setSaveMessage(error instanceof Error ? error.message : 'Could not save the plan.');
    } finally {
      setIsSavingPlan(false);
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
            <TextInput
              value={raceDate}
              onChangeText={setRaceDate}
              placeholder="YYYY-MM-DD"
              style={styles.input}
              keyboardType="numbers-and-punctuation"
            />
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

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
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
