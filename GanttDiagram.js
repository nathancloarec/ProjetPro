import React, { useEffect, useState, useRef } from 'react';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import gantt from 'dhtmlx-gantt';

// Fonction pour récupérer le lundi de la semaine d'une date donnée
const getMondayOfWeek = (date) => {
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday;
};

const GanttDiagram = ({ data, setTasks }) => {
  const ganttContainer = useRef(null);

  // État local pour l'affichage du Gantt
  const [startDate, setStartDate] = useState(new Date());
  const [displayDays, setDisplayDays] = useState(7);
  const [isWeekMode, setIsWeekMode] = useState(true);

  /**
   * On transforme les données brutes (data) en tâches compréhensibles par dhtmlx-gantt.
   * On "clampe" aussi les dates pour qu'elles ne dépassent pas la plage affichée.
   */
  const transformedTasks = data.map((task) => {
    const taskStart = new Date(task.debut);
    const taskEnd = new Date(task.fin);

    // Calcul de la période visible (startDate -> startDate + displayDays)
    const ganttStart = new Date(startDate);
    const ganttEnd = new Date(ganttStart);
    ganttEnd.setDate(ganttStart.getDate() + displayDays - 1);

    // On "coupe" la tâche pour la période visible
    const visibleStart = taskStart < ganttStart ? ganttStart : taskStart;
    const visibleEnd = taskEnd > ganttEnd ? ganttEnd : taskEnd;

    // Si la tâche est en dehors de la plage, on la retire
    if (visibleStart > ganttEnd || visibleEnd < ganttStart) return null;

    // Calcul de la durée en jours
    const duration = Math.ceil((visibleEnd - visibleStart + 1) / (1000 * 3600 * 24));

    return {
      id: task.id,
      // On affiche nom + heure de début/fin
      text: `${task.nom} (${task.startTime} - ${task.endTime})`,
      start_date: visibleStart,
      duration: duration,
      progress: task.progress || 0.4,
      type: 'task',
      dependencies: task.dependencies || [],
      color: task.color || 'rgb(0, 136, 206)',
    };
  }).filter(Boolean);

  /**
   * Gère le changement de date sélectionnée dans l'input "type=date".
   * Si on est en mode semaine complète, on se cale sur le lundi de la semaine.
   */
  const handleDateChange = (event) => {
    const selectedDate = new Date(event.target.value);
    if (isWeekMode) {
      const monday = getMondayOfWeek(selectedDate);
      setStartDate(monday);
    } else {
      setStartDate(selectedDate);
    }
  };

  // Gère la saisie du nombre de jours
  const handleDaysChange = (event) => {
    const days = parseInt(event.target.value, 10);
    if (!isNaN(days) && days > 0) {
      setDisplayDays(days);
    }
  };

  // Gère la saisie du nombre de semaines
  const handleWeeksChange = (event) => {
    const weeks = parseInt(event.target.value, 10);
    if (!isNaN(weeks) && weeks > 0) {
      setDisplayDays(weeks * 7);
    }
  };

  // Permet de basculer entre "mode semaine complète" et "mode libre"
  const toggleWeekMode = () => {
    setIsWeekMode((prev) => !prev);
  };

  /**
   * useEffect #1 : S’exécute une seule fois au montage.
   * - On configure et initialise le Gantt (gantt.init).
   * - On attache les événements (onTaskChanged, onTaskDeleted).
   */
  useEffect(() => {


    // Configuration de base
    gantt.config.scales = [
      { unit: 'week', step: 1, format: 'semaine %W' },
      { unit: 'day', step: 1, format: '%d %M' },
    ];
    gantt.config.columns = [
      { name: 'text', label: 'Nom', width: '*', tree: true, align: 'center' },
      { name: 'start_date', label: 'Date Début', align: 'center' },
      { name: 'duration', label: 'Durée', align: 'center' },
    ];
    gantt.config.drag_progress = false;
    gantt.config.drag_links = false;
    
    // Activer l'édition
    gantt.config.readonly = false;
    gantt.config.drag_move = true;
    
    // Initialisation du Gantt dans le conteneur
    gantt.init(ganttContainer.current);
  

    // Événement déclenché quand une tâche est modifiée (déplacement, renommage, etc.)
    gantt.attachEvent('OnAfterTaskUpdate', (id, ganttTask) => {
      console.log("onTaskChanged déclenché pour id:", id, ganttTask);
    
      setTasks(prevTasks => prevTasks.map(t => {
        if (t.id === id) {
          // On récupère la nouvelle date de début
          const newDebut = new Date(ganttTask.start_date);
          // On calcule la date de fin à partir de la durée
          const newFin = new Date(newDebut);
          newFin.setDate(newDebut.getDate() + ganttTask.duration - 1);
    
          console.log("Nouvelle date pour la tâche", id, newDebut, newFin);
    
          // On reconstruit proprement le texte avec le nom original
          return {
            ...t,
            debut: newDebut,
            fin: newFin,
            // On reforme le texte avec les heures SANS duplication
            text: `${t.nom} (${t.startTime} - ${t.endTime})`,
          };
        }
        return t;
      }));
    });
    
    
    

    // Événement déclenché quand on supprime une tâche
    gantt.attachEvent('onTaskDeleted', (id) => {
      const updatedTasks = data.filter(t => t.id !== id);
      setTasks(updatedTasks);
    });

    // Cleanup : quand le composant se démonte, on nettoie le Gantt
    return () => {
      gantt.clearAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Pas de dépendance => on n'initialise qu'une seule fois

  /**
   * useEffect #2 : Mise à jour de l’affichage et des données.
   * - Se déclenche à chaque fois que 'transformedTasks', 'startDate' ou 'displayDays' changent.
   * - On met à jour la plage de dates, puis on recharge les données.
   */
  useEffect(() => {
    // Calcul de la date de fin d’affichage
    const now = startDate;
    const endDate = new Date(now);
    endDate.setDate(now.getDate() + displayDays - 1);

    // On met à jour la config du Gantt
    gantt.config.start_date = now;
    gantt.config.end_date = endDate;

    // On efface l’ancien affichage et on parse les nouvelles données
    gantt.clearAll();
    gantt.parse({ data: transformedTasks });
  }, [transformedTasks, startDate, displayDays]);

  // Rendu de la partie "paramètres" + conteneur Gantt
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
        <button
          style={{ marginLeft: '20px' }}
          onClick={toggleWeekMode}
        >
          {isWeekMode ? 'Mode Libre' : 'Mode Semaine Complète'}
        </button>
      </div>
      <div ref={ganttContainer} id="ganttContainer" style={{ width: '100%', height: '100%' }}></div>
    </div>
  );
};

export default GanttDiagram;
