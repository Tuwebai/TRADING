import { useEffect } from 'react';
import { RoutineChecklist } from '@/components/routines/RoutineChecklist';
import { useRoutineStore } from '@/store/routineStore';
import type { RoutineType } from '@/types/Trading';

const routineTypes: RoutineType[] = [
  'morning',
  'pre-market',
  'pre-trade',
  'post-trade',
  'end-of-day',
];

export const RoutinesPage = () => {
  const {
    loadRoutines,
    getRoutine,
    addRoutineItem,
    toggleRoutineItem,
    deleteRoutineItem,
    updateRoutineItem,
  } = useRoutineStore();

  useEffect(() => {
    loadRoutines();
  }, [loadRoutines]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rutinas y Rendimiento</h1>
        <p className="text-muted-foreground mt-1">
          Construye y rastrea tus rutinas diarias de trading y listas de verificación
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {routineTypes.map((type) => {
          const routine = getRoutine(type);
          return (
            <RoutineChecklist
              key={type}
              routine={routine}
              type={type}
              onAddItem={(text) => addRoutineItem(type, text)}
              onToggleItem={(itemId) => toggleRoutineItem(type, itemId)}
              onDeleteItem={(itemId) => deleteRoutineItem(type, itemId)}
              onEditItem={(itemId, text) => updateRoutineItem(type, itemId, { text })}
            />
          );
        })}
      </div>
    </div>
  );
};

