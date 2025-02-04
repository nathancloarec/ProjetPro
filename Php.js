import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import GanttDiagram from "./GanttDiagram";
import { v4 as uuidv4 } from "uuid";

const SERVER_URL = "http://localhost:5000";

const Php = () => {
  const location = useLocation();
  const [tasks, setTasks] = useState([]);

  // Charger les tâches depuis le serveur une seule fois au montage
  useEffect(() => {
    fetch(`${SERVER_URL}/tasks`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.length > 0) {
          // Réhydrate les dates en objets Date
          const rehydrated = data.map((task) => ({
            ...task,
            debut: new Date(task.debut),
            fin: new Date(task.fin),
          }));
          console.log("Tâches chargées depuis le serveur :", rehydrated);
          setTasks(rehydrated);
        } else {
          openFileExplorer();
        }
      })
      .catch((err) => {
        console.error("Erreur lors du chargement des tâches :", err);
        openFileExplorer();
      });
  }, []);

  // Sauvegarder les tâches sur le serveur dès qu'elles changent
  useEffect(() => {
    if (tasks.length > 0) {
      console.log("Envoi POST avec tasks:", tasks);

      fetch(`${SERVER_URL}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tasks),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Réponse du serveur:", data);
        })
        .catch((err) => {
          console.error("Erreur lors de la sauvegarde des tâches :", err);
        });
    }
  }, [tasks]);

  // Ouvre la fenêtre de sélection de fichier
  const openFileExplorer = () => {
    const fileInput = document.getElementById("fileInput");
    if (fileInput) {
      fileInput.click();
    }
  };

  // Gère l'upload du fichier
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result;
        parseFileContent(content);
      };
      reader.readAsText(file);
    }
  };

  // Fonction utilitaire pour parser la date au format "jour/mois/année"
  const parseDate = (dateString) => {
    const [day, month, year] = dateString.split("/").map(Number);
    return new Date(year, month - 1, day);
  };

  // Parse le contenu du fichier .txt et met à jour le state `tasks`
  const parseFileContent = (content) => {
    const lines = content.split("\n");
    const parsedTasks = lines
      .map((line, index) => {
        const fields = line.split("|").map((item) => item.trim());
        if (fields.length < 13) {
          console.error(`Line ${index + 1} skipped (insufficient fields):`, line);
          return null;
        }
        const [
          id,
          type,
          status,
          vehicle1,
          vehicle2,
          location,
          , // champ ignoré
          priority,
          startDateRaw,
          startStatus,
          startTimeRaw,
          endDateRaw,
          endTimeRaw,
          additionalDateRaw,
          description,
        ] = fields;
        const startDateTime = parseDate(startDateRaw);
        const endDateTime = parseDate(endDateRaw);
        if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
          console.error(`Invalid dates on line ${index + 1}:`, line);
          return null;
        }
        const formatTime = (timeRaw) => {
          const [hour, minute] = timeRaw.split(":").map(Number);
          return `${hour}:${minute < 10 ? "0" : ""}${minute}`;
        };
        const formattedStartTime = formatTime(startTimeRaw);
        const formattedEndTime = formatTime(endTimeRaw);
        return {
          id: uuidv4(),
          nom: vehicle2,
          debut: startDateTime,
          fin: endDateTime,
          startTime: formattedStartTime,
          endTime: formattedEndTime,
        };
      })
      .filter((task) => task !== null);
    console.log("Tâches parsées depuis le fichier :", parsedTasks);
    setTasks(parsedTasks);
  };

  // Ouvre le file chooser au montage si aucune tâche n'a été chargée depuis le serveur
  useEffect(() => {
    if (tasks.length === 0) {
      openFileExplorer();
    }
  }, [location, tasks]);

  return (
    <div>
      <input
        id="fileInput"
        type="file"
        accept=".txt"
        style={{ display: "none" }}
        onChange={handleFileUpload}
      />
      {tasks.length > 0 && <GanttDiagram data={tasks} setTasks={setTasks} />}
    </div>
  );
};

export default Php;
