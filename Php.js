import React, { useState, useEffect  } from "react";
import { useLocation } from "react-router-dom";
import GanttDiagram from "./GanttDiagram";
import { v4 as uuidv4 } from 'uuid';

const Php = () => {
    const location = useLocation();
    const [tasks, setTasks] = useState([]);

    const openFileExplorer = () => {
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.click();
        }
    };

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

    const parseDate = (dateString) => {
        const [day, month, year] = dateString.split('/').map(Number);
        return new Date(year, month - 1, day);
    };

    const parseFileContent = (content) => {
        const lines = content.split('\n');
        const parsedTasks = lines.map((line, index) => {
            const fields = line.split('|').map((item) => item.trim());
            if (fields.length < 13) {
                console.error(`Line ${index + 1} skipped due to insufficient fields:`, line);
                return null;
            }

            const [
                id, type, status, vehicle1, vehicle2, location, , priority, 
                startDateRaw, startStatus, startTimeRaw, endDateRaw, endTimeRaw, additionalDateRaw, description
            ] = fields;

            const startDateTime = parseDate(startDateRaw);
            const endDateTime = parseDate(endDateRaw);

            if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
                console.error(`Invalid dates on line ${index + 1}:`, line);
                return null;
            }

            const formatTime = (timeRaw) => {
                const [hour, minute] = timeRaw.split(':').map(Number);
                return `${hour}:${minute < 10 ? '0' : ''}${minute}`;
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
        }).filter(task => task !== null);

        setTasks(parsedTasks);
    };

    useEffect(() => {
        openFileExplorer();
    }, [location]);

    return (
        <div>
            <input
                id="fileInput"
                type="file"
                accept=".txt"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
            />

            {tasks.length > 0 && <GanttDiagram data={tasks} setTasks={setTasks} />}
        </div>
    );
};

export default Php;
