import axios from 'axios';

let currentTaskId: string | null = null;
let userId: string | null = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
        case 'START_SHARING':
            handleStartSharing();
            break;
        case 'STOP_SHARING':
            handleStopSharing();
            break;
        case 'SCRAPED_DATA':
            handleScrapedData(message.data, message.bandwidthUsed);
            break;
        default:
            console.warn('Unknown message type:', message.type);
    }
});

async function handleStartSharing() {
    try {
        const response = await axios.post('http://localhost:5000/assign-task', {});
        const { id, assignedToId } = response.data;
        currentTaskId = id;
        userId = assignedToId;
        console.log('Task assigned:', currentTaskId);
    } catch (error) {
        console.error('Error starting sharing:', error);
    }
}

async function handleStopSharing() {
    console.log('Stopped sharing');
    currentTaskId = null;
    userId = null;
}

async function handleScrapedData(data: string, bandwidthUsed: number) {
    if (!currentTaskId || !userId) return;

    try {
        await axios.post('http://localhost:5000/submit-data', {
            taskId: currentTaskId,
            data,
            bandwidthUsed,
        });
        console.log('Data submitted for task:', currentTaskId);
    } catch (error) {
        console.error('Error submitting data:', error);
    }
}
