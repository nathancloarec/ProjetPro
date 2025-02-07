import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import GanttDiagram from "./GanttDiagram";
import { v4 as uuidv4 } from "uuid";

const SERVER_URL = "http://localhost:5000";

const Php = () => {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);

  // Fonction pour récupérer les tâches du serveur
  const fetchTasks = () => {
    fetch(`${SERVER_URL}/tasks`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.length) {
          setTasks(data.map((task) => ({
            ...task,
            debut: new Date(task.debut),
            fin: new Date(task.fin),
          })));
        } else {
          openFileExplorer();
        }
      })
      .catch(() => openFileExplorer());
  };

  // Sauvegarder les modifications des tâches sur le serveur
  const updateTask = (updatedTask) => {
    fetch(`${SERVER_URL}/tasks/${updatedTask.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        debut: updatedTask.debut.toISOString(),
        fin: updatedTask.fin.toISOString(),
        text: updatedTask.text,
      }),
    }).catch((err) => console.error("Erreur lors de la mise à jour :", err));
  };

  // Ouvre le file explorer
  const openFileExplorer = () => {
    document.getElementById("fileInput")?.click();
  };

  // Gère l'upload du fichier
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => parseFileContent(reader.result);
      reader.readAsText(file);
    }
  };

  // Fonction utilitaire pour parser la date
  const parseDate = (dateString) => {
    const [day, month, year] = dateString.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  // Parse le contenu du fichier .txt et met à jour les tâches
  const parseFileContent = (content) => {
    const parsedTasks = content.split("\n")
      .map((line, index) => {
        const fields = line.split("|").map((item) => item.trim());
        if (fields.length < 13) return null;
        
        const [
          , , , , , , , , startDateRaw, , startTimeRaw, endDateRaw, endTimeRaw,
        ] = fields;

        const startDateTime = parseDate(startDateRaw);
        const endDateTime = parseDate(endDateRaw);
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) return null;

        return {
          id: uuidv4(),
          nom: fields[3],  // vehicle2
          debut: startDateTime,
          fin: endDateTime,
          startTime: startTimeRaw,
          endTime: endTimeRaw,
        };
      })
      .filter(Boolean); // On garde seulement les tâches valides

    setTasks(parsedTasks);
  };

  // Ouverture du file explorer au montage si aucune tâche
  useEffect(() => {
    if (!tasks.length && location.state?.fromUpload) openFileExplorer();
  }, [location, tasks.length]);

  // Charger les tâches du serveur au montage
  useEffect(() => {
    fetchTasks();
  }, []);

  return (
    <div>
      <input
        id="fileInput"
        type="file"
        accept=".txt"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />
      {tasks.length > 0 && <GanttDiagram data={tasks} setTasks={setTasks} updateTask={updateTask} />}
    </div>
  );
};

export default Php;
