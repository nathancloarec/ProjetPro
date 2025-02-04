import React, { useEffect, useState, useRef } from 'react';
import 'dhtmlx-gantt/codebase/dhtmlxgantt.css';
import gantt from 'dhtmlx-gantt';

const getMondayOfWeek = (date) => {
    const day = date.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diff);
    return monday;
};

const GanttDiagram = ({ data, setTasks }) => {
    const ganttContainer = useRef(null);
    const [startDate, setStartDate] = useState(new Date());
    const [displayDays, setDisplayDays] = useState(7);
    const [isWeekMode, setIsWeekMode] = useState(true);

    const tasks = data.map((task) => {
        const taskStart = new Date(task.debut);
        const taskEnd = new Date(task.fin);

        const ganttStart = new Date(startDate);
        const ganttEnd = new Date(ganttStart);
        ganttEnd.setDate(ganttStart.getDate() + displayDays - 1);

        const visibleStart = taskStart < ganttStart ? ganttStart : taskStart;
        const visibleEnd = taskEnd > ganttEnd ? ganttEnd : taskEnd;

        if (visibleStart > ganttEnd || visibleEnd < ganttStart) return null;

        const duration = Math.ceil((visibleEnd - visibleStart + 1) / (1000 * 3600 * 24));

        return {
            id: task.id,
            text: `${task.nom} (${task.startTime} - ${task.endTime})`,
            start_date: visibleStart,
            duration: duration,
            progress: task.progress || 0.4,
            type: 'task',
            dependencies: task.dependencies || [],
            color: task.color || 'rgb(0, 136, 206)',
        };
    }).filter(Boolean);

    const handleDateChange = (event) => {
        const selectedDate = new Date(event.target.value);
        if (isWeekMode) {
            const monday = getMondayOfWeek(selectedDate);
            setStartDate(monday);
        } else {
            setStartDate(selectedDate);
        }
    };

    const handleDaysChange = (event) => {
        const days = parseInt(event.target.value, 10);
        if (!isNaN(days) && days > 0) {
            setDisplayDays(days);
        }
    };

    const handleWeeksChange = (event) => {
        const weeks = parseInt(event.target.value, 10);
        if (!isNaN(weeks) && weeks > 0) {
            setDisplayDays(weeks * 7);
        }
    };

    const toggleWeekMode = () => {
        setIsWeekMode((prev) => !prev);
    };

    useEffect(() => {
        if (tasks.length > 0) {
            const now2 = startDate;
            const endDate2 = new Date(now2);
            endDate2.setDate(now2.getDate() + displayDays - 1);

            gantt.config.start_date = now2;
            gantt.config.end_date = endDate2;

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

            gantt.init(ganttContainer.current);
            gantt.parse({ data: tasks });

            // Écouter les événements de mise à jour des tâches
            gantt.attachEvent('onTaskChanged', (id, task) => {
                const updatedTasks = data.map(t => t.id === id ? { ...t, ...task } : t);
                setTasks(updatedTasks);
            });

            gantt.attachEvent('onTaskDeleted', (id) => {
                const updatedTasks = data.filter(t => t.id !== id);
                setTasks(updatedTasks);
            });
        }

        return () => gantt.clearAll();
    }, [tasks, startDate, displayDays, data, setTasks]);

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
