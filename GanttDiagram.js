import React, { useEffect, useState, useRef } from 'react';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import gantt from 'dhtmlx-gantt';

// Fonction pour avoir le lundi de la semaine d'une date donnée
const getMondayOfWeek = (date) => {
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday;
};

const GanttDiagram = ({ data, setTasks, updateTask }) => {
  const ganttContainer = useRef(null);  // Référence au conteneur du Gantt

  // États locaux
  const [startDate, setStartDate] = useState(new Date());  // Date de début de l'affichage
  const [displayDays, setDisplayDays] = useState(7);  // Nombre de jours à afficher
  const [isWeekMode, setIsWeekMode] = useState(true);  // Mode semaine complète ou libre

  // Transformation des données pour qu'elles soient compatibles avec dhtmlx-gantt
  const transformedTasks = data.map((task) => {
    const taskStart = new Date(task.debut);
    const taskEnd = new Date(task.fin);

    const ganttStart = new Date(startDate);  // Début de la période affichée
    const ganttEnd = new Date(ganttStart);  // Fin de la période affichée
    ganttEnd.setDate(ganttStart.getDate() + displayDays - 1);

    const visibleStart = taskStart < ganttStart ? ganttStart : taskStart;
    const visibleEnd = taskEnd > ganttEnd ? ganttEnd : taskEnd;

    // Si la tâche est hors de la plage, on l'ignore
    if (visibleStart > ganttEnd || visibleEnd < ganttStart) return null;

    // Calcul de la durée de la tâche
    const duration = Math.ceil((visibleEnd - visibleStart + 1) / (1000 * 3600 * 24));

    return {
      id: task.id,
      text: `${task.nom} (${task.startTime} - ${task.endTime})`,  // Affiche le nom et les heures
      start_date: visibleStart,
      duration: duration,
      progress: task.progress || 0.4,
      type: 'task',
      dependencies: task.dependencies || [],
      color: task.color || 'rgb(0, 136, 206)',
    };
  }).filter(Boolean);  // Filtre les tâches invalides

  // Gestion du changement de date (sur l'input "date")
  const handleDateChange = (event) => {
    const selectedDate = new Date(event.target.value);
    if (isWeekMode) {
      const monday = getMondayOfWeek(selectedDate);
      setStartDate(monday);
    } else {
      setStartDate(selectedDate);
    }
  };

  // Gestion du changement du nombre de jours affichés
  const handleDaysChange = (event) => {
    const days = parseInt(event.target.value, 10);
    if (!isNaN(days) && days > 0) {
      setDisplayDays(days);
    }
  };

  // Gestion du changement du nombre de semaines affichées
  const handleWeeksChange = (event) => {
    const weeks = parseInt(event.target.value, 10);
    if (!isNaN(weeks) && weeks > 0) {
      setDisplayDays(weeks * 7);
    }
  };

  // Bascule entre "mode semaine complète" et "mode libre"
  const toggleWeekMode = () => {
    setIsWeekMode((prev) => !prev);
  };

  // useEffect pour configurer le Gantt et ses événements
  useEffect(() => {
    gantt.config.scales = [
      { unit: 'week', step: 1, format: 'semaine %W' },
      { unit: 'day', step: 1, format: '%d %M' },
    ];

    // Retirer les liens (cercles de dépendances entre tâches)
    gantt.config.links = false;  // Ajoute cette ligne pour supprimer les liens

    // Retirer le triangle de progression
    gantt.config.drag_progress = false;  // Désactive la possibilité de changer la progression par drag-and-drop
    gantt.config.drag_links = false;     // Désactive les liens

    gantt.config.columns = [
      { name: 'text', label: 'Nom', width: '*', tree: true, align: 'center' },
      { name: 'start_date', label: 'Date Début', align: 'center' },
      { name: 'duration', label: 'Durée', align: 'center' },
    ];
    gantt.config.readonly = false;  // Permet l'édition
    gantt.config.drag_move = true;  // Permet de déplacer les tâches
    gantt.init(ganttContainer.current);  // Initialise le Gantt

    // Événement quand une tâche est modifiée
    gantt.attachEvent("OnAfterTaskUpdate", (id, ganttTask) => {
      setTasks((prevTasks) => 
        prevTasks.map((t) => {
          if (t.id === id) {
            const newDebut = new Date(ganttTask.start_date);
            newDebut.setHours(0, 0, 0, 0);
    
            const newFin = new Date(newDebut);
            newFin.setDate(newDebut.getDate() + ganttTask.duration - 1);
            newFin.setHours(23, 59, 59, 999);
    
            const updatedTask = {  
              ...t,
              debut: newDebut,
              fin: newFin,
              text: ganttTask.text, // Assure-toi que le texte est bien récupéré ici
            };
    
            // Appelle updateTask pour mettre à jour la tâche
            updateTask(updatedTask);
            return updatedTask;
          }
          return t;
        })
      );
    });

    // Cleanup à la destruction du composant
    return () => gantt.clearAll();
  }, []);  // Ne se lance qu'une fois au montage

  // useEffect pour mettre à jour l'affichage du Gantt quand les données changent
  useEffect(() => {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + displayDays - 1);

    gantt.config.start_date = startDate;
    gantt.config.end_date = endDate;

    gantt.clearAll();  // Efface les anciennes tâches
    gantt.parse({ data: transformedTasks });  // Charge les nouvelles tâches
  }, [transformedTasks, startDate, displayDays]);

  // Rendu du composant avec les paramètres de configuration
  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <div style={{ marginBottom: '10px' }}>
        <label>
          Sélectionner une date :
          <input
            type="date"
            onChange={handleDateChange}
            value={startDate.toISOString().split('T')[0]}
            style={{ marginLeft: '10px' }}
          />
        </label>
        <label style={{ marginLeft: '20px' }}>
          Nombre de jours :
          <input
            type="number"
            min="1"
            onChange={handleDaysChange}
            value={displayDays}
            style={{ marginLeft: '10px', width: '60px' }}
          />
        </label>
        <label style={{ marginLeft: '20px' }}>
          Nombre de semaines :
          <input
            type="number"
            min="1"
            onChange={handleWeeksChange}
            value={Math.ceil(displayDays / 7)}
            style={{ marginLeft: '10px', width: '60px' }}
          />
        </label>
        <button style={{ marginLeft: '20px' }} onClick={toggleWeekMode}>
          {isWeekMode ? 'Mode Libre' : 'Mode Semaine Complète'}
        </button>
      </div>
      <div ref={ganttContainer} id="ganttContainer" style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
};

export default GanttDiagram;
