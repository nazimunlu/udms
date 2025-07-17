import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, setLogLevel, collection, onSnapshot, addDoc, doc, setDoc, deleteDoc, Timestamp, query, where, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// --- ICONS (using inline SVG for simplicity) ---
const Icon = ({ path, className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d={path} />
    </svg>
);

const ICONS = {
    DASHBOARD: "M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z",
    STUDENTS: "M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z",
    GROUPS: "M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
    FINANCES: "M5 8v10h14V8H5zm16-4H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-2 14H5V8h14v10z",
    DOCUMENTS: "M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z",
    SETTINGS: "M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19-.15-.24.42.12-.64l2 3.46c.12-.22.39.3.61-.22l2.49-1c.52.4 1.08.73 1.69-.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61-.22l2 3.46c.12-.22-.07.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z",
    SUN: "M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.64 6.36c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l1.41 1.41c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41L5.64 6.36zm12.73 12.73c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l1.41 1.41c.39.39 1.02.39 1.41 0s.39-1.02 0-1.41l-1.41-1.41zM5.64 19.07c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-1.41 1.41c-.39.39-.39 1.02 0 1.41s1.02.39 1.41 0l1.41-1.41zm12.73-12.73c.39-.39.39-1.02 0-1.41s-1.02-.39-1.41 0l-1.41 1.41c-.39.39-.39 1.02 0 1.41s1.02.39 1.41 0l1.41-1.41z",
    MOON: "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-0.46-0.04-0.92-0.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81 0.89-3.42 2.26-4.4C12.92 3.04 12.46 3 12 3Z",
    MENU: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
    DELETE: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
    EDIT: "M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z",
    ADD: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
    CLOSE: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
    CALENDAR: "M17 13h-5v5h5v-5zM16 2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-1V2h-2zm3 18H5V9h14v11z",
    CLOCK: "M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z",
    CHEVRON_LEFT: "M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z",
    CHEVRON_RIGHT: "M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z",
    REMOVE_CIRCLE: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11H7v-2h10v2z",
};

// --- FIREBASE CONFIGURATION ---
// This configuration is provided by the environment.
const firebaseConfigString = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
let firebaseConfig = {};
try {
    firebaseConfig = JSON.parse(firebaseConfigString);
} catch (e) {
    console.error("Could not parse Firebase config:", e);
}

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
// setLogLevel('debug'); // Uncomment for detailed Firestore logs

// --- APP & THEME CONTEXT ---
const ThemeContext = createContext();
const AppContext = createContext();

// ThemeProvider manages the dark/light mode state of the application.
const ThemeProvider = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const toggleTheme = () => setIsDarkMode(!isDarkMode);
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);
    return <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>{children}</ThemeContext.Provider>;
};

// --- HOOKS ---
// Custom hook to detect clicks outside a specified element.
const useClickOutside = (ref, handler) => {
    useEffect(() => {
        const listener = (event) => {
            if (!ref.current || ref.current.contains(event.target)) {
                return;
            }
            handler(event);
        };
        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);
        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [ref, handler]);
};


// --- REUSABLE UI COMPONENTS ---
// A generic Modal component for displaying pop-up content.
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                    {typeof title === 'string' ? (
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
                    ) : (
                        <div>{title}</div>
                    )}
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"><Icon path={ICONS.CLOSE} /></button>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

// A confirmation dialog for destructive actions.
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <p className="text-gray-700 dark:text-gray-300 mb-6">{message}</p>
            <div className="flex justify-end space-x-4">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700">Confirm</button>
            </div>
        </Modal>
    );
};

// A standardized form input component.
const FormInput = ({ label, icon, ...props }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
        <div className="relative">
            <input {...props} className={`block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${icon ? 'pr-10' : ''}`} />
            {icon && <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">{icon}</span>}
        </div>
    </div>
);

// A standardized form select dropdown.
const FormSelect = ({ label, children, ...props }) => (
     <div>
        {label && <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>}
        <select {...props} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            {children}
        </select>
    </div>
);

// A component to structure forms into logical sections.
const FormSection = ({ title, children }) => (
    <fieldset className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
        <legend className="text-lg font-medium text-gray-900 dark:text-gray-100">{title}</legend>
        <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">{children}</div>
    </fieldset>
);

// A custom date picker component with a calendar interface.
const CustomDatePicker = ({ label, value, onChange, name }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Safely gets a Date object from various possible input types.
    const getInitialDate = (v) => {
        if (v && typeof v.toDate === 'function') return v.toDate();
        if (v instanceof Date) return v;
        if (typeof v === 'string' && v) return new Date(v.replace(/-/g, '/')); // More robust parsing
        return new Date();
    };

    const [displayDate, setDisplayDate] = useState(getInitialDate(value));
    const pickerRef = useRef(null);
    useClickOutside(pickerRef, () => setIsOpen(false));

    // Update the calendar display date when the value prop changes or the picker is opened.
    useEffect(() => {
        setDisplayDate(getInitialDate(value));
    }, [value, isOpen]);

    const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Calculates the first day of the month (0 for Monday, 6 for Sunday).
    const getFirstDayOfMonth = (date) => {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return (day + 6) % 7; 
    };

    const firstDayOfMonth = getFirstDayOfMonth(displayDate);
    const daysInMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0).getDate();

    const changeMonth = (offset) => {
        setDisplayDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    // Handles date selection and formats it to YYYY-MM-DD.
    const handleSelectDate = (day) => {
        const selected = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
        const year = selected.getFullYear();
        const month = (selected.getMonth() + 1).toString().padStart(2, '0');
        const date = selected.getDate().toString().padStart(2, '0');
        const dateString = `${year}-${month}-${date}`;
        onChange({ target: { name, value: dateString } });
        setIsOpen(false);
    };

    // Parse the selected date string back to a Date object for comparison.
    let selectedDateObj = null;
    if (value && typeof value === 'string') {
        const [year, month, day] = value.split('-').map(Number);
        selectedDateObj = new Date(year, month - 1, day);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return (
        <div className="relative" ref={pickerRef}>
            <FormInput 
                label={label} 
                value={value} 
                readOnly 
                onClick={() => setIsOpen(!isOpen)} 
                icon={<Icon path={ICONS.CALENDAR} className="w-5 h-5 text-gray-400"/>}
                className="cursor-pointer"
            />
            {isOpen && (
                <div className="absolute z-20 mt-1 w-80 bg-white dark:bg-gray-700 shadow-lg rounded-lg p-4 border dark:border-gray-600">
                    <div className="flex justify-between items-center mb-4">
                        <button type="button" onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"><Icon path={ICONS.CHEVRON_LEFT} /></button>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{monthNames[displayDate.getMonth()]} {displayDate.getFullYear()}</span>
                        <button type="button" onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600"><Icon path={ICONS.CHEVRON_RIGHT} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                        {daysOfWeek.map(day => <div key={day} className="font-medium text-gray-500 dark:text-gray-400">{day}</div>)}
                        {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`}></div>)}
                        {Array.from({ length: daysInMonth }).map((_, day) => {
                            const dayNumber = day + 1;
                            const date = new Date(displayDate.getFullYear(), displayDate.getMonth(), dayNumber);
                            const isSelected = selectedDateObj && date.getTime() === selectedDateObj.getTime();
                            const isToday = date.getTime() === today.getTime();

                            return (
                                <div key={dayNumber} onClick={() => handleSelectDate(dayNumber)} 
                                     className={`p-2 rounded-full cursor-pointer 
                                     ${isSelected ? 'bg-blue-600 text-white' : 
                                     isToday ? 'bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200' : 
                                     'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                                    {dayNumber}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

// A custom time picker component with a dropdown list of options.
const CustomTimePicker = ({ label, value, onChange, name, options }) => {
    const [isOpen, setIsOpen] = useState(false);
    const pickerRef = useRef(null);
    useClickOutside(pickerRef, () => setIsOpen(false));

    const handleSelect = (option) => {
        onChange({ target: { name, value: option } });
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={pickerRef}>
            <FormInput 
                label={label} 
                value={value} 
                readOnly 
                onClick={() => setIsOpen(!isOpen)} 
                icon={<Icon path={ICONS.CLOCK} className="w-5 h-5 text-gray-400"/>}
                className="cursor-pointer"
            />
            {isOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 shadow-lg rounded-md max-h-60 overflow-auto border dark:border-gray-600">
                    <ul className="py-1">
                        {options.map(option => (
                            <li key={option} onClick={() => handleSelect(option)} className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-500 hover:text-white cursor-pointer">
                                {option}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// --- StudentFormModal.js ---
// Modal for enrolling a new student or editing an existing one.
const StudentFormModal = ({ isOpen, onClose, studentToEdit }) => {
    const { db, storage, userId, appId, groups } = useContext(AppContext);
    
    // Generate time options for dropdowns (e.g., 09:00, 09:30).
    const timeOptions = [];
    for (let h = 9; h <= 23; h++) {
        timeOptions.push(`${h.toString().padStart(2, '0')}:00`);
        timeOptions.push(`${h.toString().padStart(2, '0')}:30`);
    }
    timeOptions.push('00:00');

    // Defines the initial state of the form, handling both new and existing students.
    const getInitialFormData = useCallback(() => {
        const getSafeDateString = (dateSource) => {
            if (dateSource && typeof dateSource.toDate === 'function') {
                return dateSource.toDate().toISOString().split('T')[0];
            }
            if (typeof dateSource === 'string' && dateSource) {
                return dateSource;
            }
            return '';
        };

        const initialEnrollmentDate = getSafeDateString(studentToEdit?.enrollmentDate) || new Date().toISOString().split('T')[0];
        const initialTutorDetails = studentToEdit?.tutoringDetails || {};

        return {
            fullName: studentToEdit?.fullName || '',
            studentContact: studentToEdit?.studentContact || '',
            parentContact: studentToEdit?.parentContact || '',
            enrollmentDate: initialEnrollmentDate,
            isTutoring: studentToEdit?.isTutoring || false,
            groupId: studentToEdit?.groupId || null,
            documents: studentToEdit?.documents || { nationalIdUrl: '', agreementUrl: '' },
            feeDetails: studentToEdit?.feeDetails || { totalFee: '12000', numberOfInstallments: '3' },
            tutoringDetails: {
                hourlyRate: initialTutorDetails.hourlyRate || '',
                endDate: getSafeDateString(initialTutorDetails.endDate),
                schedule: initialTutorDetails.schedule || { days: [], startTime: '09:00', endTime: '10:00' }
            }
        };
    }, [studentToEdit]);

    const [formData, setFormData] = useState(getInitialFormData());
    const [files, setFiles] = useState({ nationalId: null, agreement: null });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    
    // Reset form state when the modal is opened.
    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialFormData());
            setFiles({ nationalId: null, agreement: null });
            setStatusMessage(null);
        }
    }, [isOpen, getInitialFormData]);

    // Generic handler for most form inputs.
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    // Specific handlers for nested state objects.
    const handleFeeChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, feeDetails: {...prev.feeDetails, [name]: value }}));
    };

    const handleTutoringChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, tutoringDetails: {...prev.tutoringDetails, [name]: value }}));
    };

    const handleTutoringScheduleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            tutoringDetails: {
                ...prev.tutoringDetails,
                schedule: {
                    ...prev.tutoringDetails.schedule,
                    [name]: value
                }
            }
        }));
    };

    // Toggles a day in the recurring schedule array.
    const toggleScheduleDay = (day) => {
        const currentDays = formData.tutoringDetails.schedule.days;
        const newDays = currentDays.includes(day)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day];
        setFormData(prev => ({...prev, tutoringDetails: {...prev.tutoringDetails, schedule: {...prev.tutoringDetails.schedule, days: newDays}}}));
    };

    const handleFileChange = (e) => {
        const { name, files: selectedFiles } = e.target;
        if (selectedFiles[0]) { setFiles(prev => ({ ...prev, [name]: selectedFiles[0] })); }
    };

    // Uploads a file to Firebase Storage and returns the download URL.
    const uploadFile = async (file, path) => {
        if (!file) return null;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    // Handles form submission, including file uploads and data conversion.
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatusMessage(null);
        let dataToSave = { ...formData };
        try {
            // Upload files if new ones are selected.
            const nationalIdUrl = await uploadFile(files.nationalId, `artifacts/${appId}/users/${userId}/students/${Date.now()}_nationalId`);
            const agreementUrl = await uploadFile(files.agreement, `artifacts/${appId}/users/${userId}/students/${Date.now()}_agreement`);
            if(nationalIdUrl) dataToSave.documents.nationalIdUrl = nationalIdUrl;
            if(agreementUrl) dataToSave.documents.agreementUrl = agreementUrl;
            
            // Convert date strings to Firestore Timestamps before saving.
            const toTimestamp = (dateString) => {
                if (!dateString || typeof dateString !== 'string') return null;
                const [year, month, day] = dateString.split('-').map(Number);
                return Timestamp.fromDate(new Date(year, month - 1, day));
            };

            dataToSave.enrollmentDate = toTimestamp(dataToSave.enrollmentDate);
            if (dataToSave.tutoringDetails.endDate) {
                dataToSave.tutoringDetails.endDate = toTimestamp(dataToSave.tutoringDetails.endDate);
            } else {
                dataToSave.tutoringDetails.endDate = null;
            }

            // Update an existing document or add a new one.
            if (studentToEdit) {
                const studentDocRef = doc(db, 'artifacts', appId, 'users', userId, 'students', studentToEdit.id);
                await setDoc(studentDocRef, dataToSave, { merge: true });
            } else {
                const studentCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'students');
                await addDoc(studentCollectionPath, dataToSave);
            }
            onClose();
        } catch (error) {
            console.error("Error saving student:", error);
            console.error("Data that failed to save:", dataToSave);
            setStatusMessage({ type: 'error', text: 'Failed to save student. Please check console for details.' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={studentToEdit ? "Edit Student" : "Enroll New Student"}>
            <form onSubmit={handleSubmit}>
                <FormSection title="General Information">
                    <div className="sm:col-span-6"><FormInput label="Full Name" name="fullName" value={formData.fullName} onChange={handleChange} required /></div>
                    <div className="sm:col-span-3"><FormInput label="Student Contact" name="studentContact" type="tel" value={formData.studentContact} onChange={handleChange} required /></div>
                    <div className="sm:col-span-3"><FormInput label="Parent Contact (Optional)" name="parentContact" type="tel" value={formData.parentContact} onChange={handleChange} /></div>
                    <div className="sm:col-span-3">
                        <CustomDatePicker label="Enrollment Date" name="enrollmentDate" value={formData.enrollmentDate} onChange={handleChange} />
                    </div>
                    <div className="sm:col-span-3 flex items-end pb-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="isTutoring" checked={formData.isTutoring} onChange={handleChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                            <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">Is Tutoring Student?</span>
                        </label>
                    </div>
                </FormSection>

                {formData.isTutoring ? (
                    <FormSection title="Tutoring Details">
                        <div className="sm:col-span-3"><FormInput label="Hourly Rate (₺)" name="hourlyRate" type="number" value={formData.tutoringDetails.hourlyRate} onChange={handleTutoringChange} /></div>
                        <div className="sm:col-span-3"><CustomDatePicker label="End Date" name="endDate" value={formData.tutoringDetails.endDate} onChange={handleTutoringChange} /></div>
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recurring Schedule</label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <button type="button" key={day} onClick={() => toggleScheduleDay(day)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${formData.tutoringDetails.schedule.days.includes(day) ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                                        {day}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex-1"><CustomTimePicker label="Start Time" name="startTime" value={formData.tutoringDetails.schedule.startTime} onChange={handleTutoringScheduleChange} options={timeOptions}/></div>
                                <div className="pt-6 text-gray-500">-</div>
                                <div className="flex-1"><CustomTimePicker label="End Time" name="endTime" value={formData.tutoringDetails.schedule.endTime} onChange={handleTutoringScheduleChange} options={timeOptions}/></div>
                            </div>
                        </div>
                    </FormSection>
                ) : (
                    <>
                        <FormSection title="Group & Financial Details">
                            <div className="sm:col-span-6">
                                <FormSelect label="Assign to Group" name="groupId" value={formData.groupId || ''} onChange={handleChange}>
                                    <option value="">Select a group</option>
                                    {groups.map(group => <option key={group.id} value={group.id}>{group.groupName}</option>)}
                                </FormSelect>
                            </div>
                            <div className="sm:col-span-3"><FormInput label="Total Fee (₺)" name="totalFee" type="number" value={formData.feeDetails.totalFee} onChange={handleFeeChange} /></div>
                            <div className="sm:col-span-3"><FormInput label="Number of Installments" name="numberOfInstallments" type="number" value={formData.feeDetails.numberOfInstallments} onChange={handleFeeChange} /></div>
                        </FormSection>
                        <FormSection title="Document Uploads">
                           <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">National ID</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                            <label htmlFor="nationalId" className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"><span>Upload a file</span><input id="nationalId" name="nationalId" type="file" className="sr-only" onChange={handleFileChange} /></label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{files.nationalId ? files.nationalId.name : 'PNG, JPG, PDF up to 10MB'}</p>
                                    </div>
                                </div>
                           </div>
                           <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agreement</label>
                                 <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                                        <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                            <label htmlFor="agreement" className="relative cursor-pointer bg-white dark:bg-gray-700 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"><span>Upload a file</span><input id="agreement" name="agreement" type="file" className="sr-only" onChange={handleFileChange} /></label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{files.agreement ? files.agreement.name : 'PNG, JPG, PDF up to 10MB'}</p>
                                    </div>
                                </div>
                           </div>
                        </FormSection>
                    </>
                )}
                <div className="flex justify-end pt-8 mt-8 border-t dark:border-gray-700 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Student'}</button>
                </div>
                {statusMessage && <p className={`mt-4 text-center text-sm ${statusMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{statusMessage.text}</p>}
            </form>
        </Modal>
    );
};


// --- StudentsModule.js ---
// The main component for the "Students" page.
const StudentsModule = () => {
    const { db, userId, appId } = useContext(AppContext);
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('group');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);

    // Fetches and listens for real-time updates to the students collection.
    useEffect(() => {
        if (!userId || !appId) return;
        setIsLoading(true);
        const studentCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'students');
        const unsubscribe = onSnapshot(studentCollectionPath, (snapshot) => {
            const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(studentsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching students:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [db, userId, appId]);
    
    // Opens the confirmation modal before deleting a student.
    const openDeleteConfirmation = (student) => {
        setStudentToDelete(student);
        setIsConfirmModalOpen(true);
    };

    // Deletes a student document from Firestore.
    const handleDeleteStudent = async () => {
        if (!studentToDelete) return;
        try {
            const studentDocRef = doc(db, 'artifacts', appId, 'users', userId, 'students', studentToDelete.id);
            await deleteDoc(studentDocRef);
            // Note: Associated documents in Storage are not deleted here to prevent accidental data loss.
            // This would require a more complex implementation, possibly with cloud functions.
        } catch (error) {
            console.error("Error deleting student:", error);
        } finally {
            setIsConfirmModalOpen(false);
            setStudentToDelete(null);
        }
    };

    const openAddModal = () => { setStudentToEdit(null); setIsFormModalOpen(true); };
    const openEditModal = (student) => { setStudentToEdit(student); setIsFormModalOpen(true); };
    const filteredStudents = students.filter(s => activeTab === 'group' ? !s.isTutoring : s.isTutoring);

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Students</h2>
                <button onClick={openAddModal} className="flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow"><Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>Add Student</button>
            </div>
            <div className="mb-4 border-b border-gray-200 dark:border-gray-700">
                <nav className="flex space-x-4" aria-label="Tabs">
                    <button onClick={() => setActiveTab('group')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'group' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Group Students</button>
                    <button onClick={() => setActiveTab('tutoring')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'tutoring' ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>Tutoring Students</button>
                </nav>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300 uppercase">Full Name</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300 uppercase">Contact</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300 uppercase">Enrollment Date</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 dark:text-gray-300 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {isLoading ? (
                                <tr><td colSpan="4" className="p-4 text-center text-gray-500">Loading students...</td></tr>
                            ) : filteredStudents.length > 0 ? (
                                filteredStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="p-4 text-gray-800 dark:text-gray-200">{student.fullName}</td>
                                        <td className="p-4 text-gray-600 dark:text-gray-400">{student.studentContact}</td>
                                        <td className="p-4 text-gray-600 dark:text-gray-400">{student.enrollmentDate?.toDate().toLocaleDateString()}</td>
                                        <td className="p-4">
                                            <div className="flex space-x-2">
                                                <button onClick={() => openEditModal(student)} className="p-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
                                                <button onClick={() => openDeleteConfirmation(student)} className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><Icon path={ICONS.DELETE} className="w-5 h-5" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="4" className="p-4 text-center text-gray-500">No students found in this category.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <StudentFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} studentToEdit={studentToEdit} />
            <ConfirmationModal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} onConfirm={handleDeleteStudent} title="Delete Student" message={`Are you sure you want to delete ${studentToDelete?.fullName}? This action cannot be undone.`} />
        </div>
    );
};

// --- GroupsModule.js ---
// The main component for the "Groups" page.
const GroupsModule = () => {
    const { db, userId, appId } = useContext(AppContext);
    const [groups, setGroups] = useState([]);
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);

    // Fetches both groups and students to calculate student counts and populate details.
    useEffect(() => {
        if (!userId || !appId) return;
        const groupsCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'groups');
        const studentsCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'students');

        const unsubGroups = onSnapshot(groupsCollectionPath, (snapshot) => {
            const groupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGroups(groupsData);
            setIsLoading(false);
        });

        const unsubStudents = onSnapshot(studentsCollectionPath, (snapshot) => {
            const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(studentsData);
        });

        return () => {
            unsubGroups();
            unsubStudents();
        };
    }, [db, userId, appId]);

    const openAddModal = () => {
        setGroupToEdit(null);
        setIsFormModalOpen(true);
    };

    const openEditModal = (group) => {
        setGroupToEdit(group);
        setIsFormModalOpen(true);
    };

    const openDetailsModal = (group) => {
        setSelectedGroup(group);
        setIsDetailsModalOpen(true);
    };

    const studentCount = (groupId) => {
        return students.filter(s => s.groupId === groupId).length;
    };

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Groups</h2>
                <button onClick={openAddModal} className="flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow"><Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>Add Group</button>
            </div>
            {isLoading ? (
                <p className="text-center text-gray-500">Loading groups...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map(group => (
                        <div key={group.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{group.groupName}</h3>
                            <div className="text-gray-600 dark:text-gray-400 mb-4">
                                {group.schedule && group.schedule.days && group.schedule.days.length > 0 && (
                                    <div>{group.schedule.days.join(', ')}: {group.schedule.startTime} - {group.schedule.endTime}</div>
                                )}
                            </div>
                            <div className="flex-grow"></div>
                            <div className="flex justify-between items-center mt-4">
                                <span className="text-sm text-gray-500">{studentCount(group.id)} Students</span>
                                <div className="flex items-center">
                                    <button onClick={() => openDetailsModal(group)} className="text-sm font-medium text-blue-600 hover:underline mr-4">Details</button>
                                    <button onClick={() => openEditModal(group)} className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
                                    {/* A delete button would go here, likely with a confirmation modal. */}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <GroupFormModal isOpen={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} groupToEdit={groupToEdit} />
            {selectedGroup && <GroupDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} group={selectedGroup} students={students.filter(s => s.groupId === selectedGroup.id)} />}
        </div>
    );
};

// Modal for adding or editing a group.
const GroupFormModal = ({ isOpen, onClose, groupToEdit }) => {
    const { db, userId, appId } = useContext(AppContext);
    const timeOptions = [];
    for (let h = 9; h <= 23; h++) {
        timeOptions.push(`${h.toString().padStart(2, '0')}:00`);
        timeOptions.push(`${h.toString().padStart(2, '0')}:30`);
    }
    timeOptions.push('00:00');

    const getInitialData = useCallback(() => ({
        groupName: groupToEdit?.groupName || '',
        schedule: groupToEdit?.schedule || { days: [], startTime: '10:00', endTime: '12:00' }
    }), [groupToEdit]);

    const [formData, setFormData] = useState(getInitialData());
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if(isOpen) setFormData(getInitialData());
    }, [isOpen, getInitialData]);

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, groupName: e.target.value }));
    };

    const handleScheduleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, schedule: {...prev.schedule, [name]: value} }));
    };

    const toggleScheduleDay = (day) => {
        const currentDays = formData.schedule.days;
        const newDays = currentDays.includes(day)
            ? currentDays.filter(d => d !== day)
            : [...currentDays, day];
        setFormData(prev => ({...prev, schedule: {...prev.schedule, days: newDays}}));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (groupToEdit) {
                const groupDocRef = doc(db, 'artifacts', appId, 'users', userId, 'groups', groupToEdit.id);
                await setDoc(groupDocRef, formData, { merge: true });
            } else {
                const groupsCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'groups');
                await addDoc(groupsCollectionPath, formData);
            }
            onClose();
        } catch (error) {
            console.error("Error saving group:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={groupToEdit ? "Edit Group" : "Add New Group"}>
            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    <FormInput label="Group Name" name="groupName" value={formData.groupName} onChange={handleChange} required />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Schedule</label>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <button type="button" key={day} onClick={() => toggleScheduleDay(day)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${formData.schedule.days.includes(day) ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>
                                    {day}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex-1"><CustomTimePicker label="Start Time" name="startTime" value={formData.schedule.startTime} onChange={handleScheduleChange} options={timeOptions}/></div>
                            <div className="pt-6 text-gray-500">-</div>
                            <div className="flex-1"><CustomTimePicker label="End Time" name="endTime" value={formData.schedule.endTime} onChange={handleScheduleChange} options={timeOptions}/></div>
                        </div>
                    </div>
                </div>
                <div className="flex justify-end pt-8 mt-8 border-t dark:border-gray-700 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Group'}</button>
                </div>
            </form>
        </Modal>
    );
};

// Modal showing detailed information about a group, including lessons and students.
const GroupDetailsModal = ({ isOpen, onClose, group, students }) => {
    const { db, userId, appId } = useContext(AppContext);
    const [studentToRemove, setStudentToRemove] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [newLesson, setNewLesson] = useState({ date: '', topic: '' });
    const [lessonToEdit, setLessonToEdit] = useState(null);
    const [lessonToDelete, setLessonToDelete] = useState(null);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [selectedLessonForAttendance, setSelectedLessonForAttendance] = useState(null);

    // Fetches lessons for the selected group.
    useEffect(() => {
        if (!group?.id) return;
        const lessonsQuery = query(collection(db, 'artifacts', appId, 'users', userId, 'lessons'), where("groupId", "==", group.id));
        const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
            const lessonsData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            // Sort lessons by date.
            lessonsData.sort((a,b) => a.lessonDate.toMillis() - b.lessonDate.toMillis());
            setLessons(lessonsData);
        });
        return unsubscribe;
    }, [db, userId, appId, group?.id]);

    // Pre-fills the lesson form when editing.
    useEffect(() => {
        if (lessonToEdit) {
            setNewLesson({
                date: lessonToEdit.lessonDate.toDate().toISOString().split('T')[0],
                topic: lessonToEdit.topic,
            });
        } else {
            setNewLesson({ date: '', topic: '' });
        }
    }, [lessonToEdit]);

    const openRemoveConfirmation = (student) => {
        setStudentToRemove(student);
    };

    // Removes a student from a group by setting their groupId to null.
    const handleRemoveStudent = async () => {
        if (!studentToRemove) return;
        const studentDocRef = doc(db, 'artifacts', appId, 'users', userId, 'students', studentToRemove.id);
        try {
            await updateDoc(studentDocRef, { groupId: null });
            setStudentToRemove(null);
        } catch (error) {
            console.error("Error removing student from group: ", error);
        }
    };

    // Adds a new lesson or updates an existing one.
    const handleAddOrUpdateLesson = async (e) => {
        e.preventDefault();
        if(!newLesson.date || !newLesson.topic) return;
        
        const lessonData = {
            topic: newLesson.topic,
            groupId: group.id,
            lessonDate: Timestamp.fromDate(new Date(newLesson.date.replace(/-/g, '/'))),
        };

        try {
            if (lessonToEdit) {
                const lessonDocRef = doc(db, 'artifacts', appId, 'users', userId, 'lessons', lessonToEdit.id);
                await updateDoc(lessonDocRef, lessonData);
            } else {
                // Initialize with an empty attendance map.
                const lessonsCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'lessons');
                await addDoc(lessonsCollectionPath, {...lessonData, attendance: {}});
            }
            setNewLesson({ date: '', topic: '' });
            setLessonToEdit(null);
        } catch (error) {
            console.error("Error saving lesson: ", error);
        }
    };

    const handleDeleteLesson = async () => {
        if (!lessonToDelete) return;
        try {
            const lessonDocRef = doc(db, 'artifacts', appId, 'users', userId, 'lessons', lessonToDelete.id);
            await deleteDoc(lessonDocRef);
            setLessonToDelete(null);
        } catch (error) {
            console.error("Error deleting lesson: ", error);
        }
    };

    const openAttendanceModal = (lesson) => {
        setSelectedLessonForAttendance(lesson);
        setIsAttendanceModalOpen(true);
    };

    // Custom title component for the modal.
    const modalTitle = (
        <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{group.groupName}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Details</p>
        </div>
    );

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
                <div className="space-y-6">
                     <FormSection title="Lessons">
                        <form onSubmit={handleAddOrUpdateLesson} className="sm:col-span-6 grid grid-cols-1 sm:grid-cols-6 gap-4 items-end">
                            <div className="sm:col-span-2"><CustomDatePicker name="date" value={newLesson.date} onChange={(e) => setNewLesson({...newLesson, date: e.target.value})} /></div>
                            <div className="sm:col-span-3"><FormInput placeholder="Lesson topic" name="topic" value={newLesson.topic} onChange={(e) => setNewLesson({...newLesson, topic: e.target.value})} /></div>
                            <div className="sm:col-span-1"><button type="submit" className="w-full px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700">{lessonToEdit ? 'Update' : 'Add'}</button></div>
                            {lessonToEdit && <div className="sm:col-span-6"><button type="button" onClick={() => setLessonToEdit(null)} className="text-sm text-gray-500 hover:underline">Cancel Edit</button></div>}
                        </form>
                        <div className="sm:col-span-6 mt-4">
                             {lessons.length > 0 ? (
                                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {lessons.map(lesson => (
                                        <li key={lesson.id} className="py-3 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-gray-200">{lesson.topic}</p>
                                                <p className="text-sm text-gray-500">{lesson.lessonDate.toDate().toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => openAttendanceModal(lesson)} className="text-sm text-gray-500 hover:text-gray-700">Attendance</button>
                                                <button onClick={() => setLessonToEdit(lesson)} className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><Icon path={ICONS.EDIT} className="w-4 h-4" /></button>
                                                <button onClick={() => setLessonToDelete(lesson)} className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"><Icon path={ICONS.DELETE} className="w-4 h-4" /></button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                             ) : (
                                <p className="text-gray-500 text-center py-4">No lessons scheduled for this group yet.</p>
                             )}
                        </div>
                    </FormSection>
                    <FormSection title="Students in this Group">
                        <div className="sm:col-span-6">
                            {students.length > 0 ? (
                                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {students.map(student => (
                                        <li key={student.id} className="py-3 flex items-center justify-between">
                                            <span className="text-gray-800 dark:text-gray-200">{student.fullName}</span>
                                            <button onClick={() => openRemoveConfirmation(student)} className="text-sm text-red-600 hover:text-red-800">Remove</button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500">No students assigned to this group yet.</p>
                            )}
                        </div>
                    </FormSection>
                </div>
            </Modal>
            {studentToRemove && (
                <ConfirmationModal 
                    isOpen={!!studentToRemove}
                    onClose={() => setStudentToRemove(null)}
                    onConfirm={handleRemoveStudent}
                    title="Remove Student"
                    message={`Are you sure you want to remove ${studentToRemove.fullName} from this group?`}
                />
            )}
            {lessonToDelete && (
                 <ConfirmationModal 
                    isOpen={!!lessonToDelete}
                    onClose={() => setLessonToDelete(null)}
                    onConfirm={handleDeleteLesson}
                    title="Delete Lesson"
                    message={`Are you sure you want to delete the lesson "${lessonToDelete.topic}"?`}
                />
            )}
            {selectedLessonForAttendance && (
                <AttendanceModal 
                    isOpen={isAttendanceModalOpen} 
                    onClose={() => setIsAttendanceModalOpen(false)} 
                    lesson={selectedLessonForAttendance} 
                    students={students}
                />
            )}
        </>
    );
};

// Modal for taking attendance for a specific lesson.
const AttendanceModal = ({ isOpen, onClose, lesson, students }) => {
    const { db, userId, appId } = useContext(AppContext);
    const [attendance, setAttendance] = useState(lesson.attendance || {});

    // Updates the attendance status for a student in real-time.
    const handleStatusChange = async (studentId, status) => {
        const newAttendance = { ...attendance, [studentId]: status };
        setAttendance(newAttendance);
        
        const lessonDocRef = doc(db, 'artifacts', appId, 'users', userId, 'lessons', lesson.id);
        await updateDoc(lessonDocRef, { attendance: newAttendance });
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'present': return 'bg-green-500 text-white';
            case 'absent': return 'bg-red-500 text-white';
            case 'late': return 'bg-yellow-500 text-white';
            default: return 'bg-gray-200 dark:bg-gray-600';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Attendance for ${lesson.topic} on ${lesson.lessonDate.toDate().toLocaleDateString()}`}>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {students.map(student => (
                    <li key={student.id} className="py-4 flex items-center justify-between">
                        <span className="font-medium text-gray-800 dark:text-gray-200">{student.fullName}</span>
                        <div className="flex space-x-2">
                            {['present', 'absent', 'late'].map(status => (
                                <button key={status} onClick={() => handleStatusChange(student.id, status)} className={`px-3 py-1 text-sm rounded-full capitalize transition-colors ${attendance[student.id] === status ? getStatusColor(status) : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'}`}>
                                    {status}
                                </button>
                            ))}
                        </div>
                    </li>
                ))}
            </ul>
        </Modal>
    );
};


// --- DashboardModule.js ---
// The main component for the "Dashboard" page.
const DashboardModule = () => {
    const { students, groups, db, userId, appId } = useContext(AppContext);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [todaysSchedule, setTodaysSchedule] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [weekEvents, setWeekEvents] = useState([]);

    // Fetches lessons and events to populate the dashboard widgets.
    useEffect(() => {
        if (!userId || !appId) return;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        
        const weekStart = new Date(todayStart);
        // Set to the most recent Monday.
        const dayOfWeek = weekStart.getDay(); // Sunday is 0, Monday is 1
        const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
        weekStart.setDate(diff);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        // Helper to get a consistent timestamp for sorting.
        const getSortableTime = (item) => (item.type === 'lesson' ? item.lessonDate : item.startTime)?.toMillis() || 0;

        // Listener for lessons
        const unsubLessons = onSnapshot(query(collection(db, 'artifacts', appId, 'users', userId, 'lessons'), where("lessonDate", ">=", todayStart)), (snapshot) => {
            const allLessons = snapshot.docs.map(doc => ({id: doc.id, type: 'lesson', ...doc.data()}));
            // Update state by replacing previous lesson data, then re-sorting.
            setTodaysSchedule(current => [...current.filter(i => i.type !== 'lesson'), ...allLessons.filter(l => getSortableTime(l) <= todayEnd.getTime())].sort((a,b) => getSortableTime(a) - getSortableTime(b)));
            setWeekEvents(current => [...current.filter(i => i.type !== 'lesson'), ...allLessons.filter(l => getSortableTime(l) < weekEnd.getTime())]);
            setUpcomingEvents(current => [...current.filter(i => i.type !== 'lesson'), ...allLessons].sort((a,b) => getSortableTime(a) - getSortableTime(b)));
        });

        // Listener for events
        const unsubEvents = onSnapshot(query(collection(db, 'artifacts', appId, 'users', userId, 'events'), where("startTime", ">=", todayStart)), (snapshot) => {
            const allEvents = snapshot.docs.map(doc => ({id: doc.id, type: 'event', ...doc.data()}));
            // Update state by replacing previous event data, then re-sorting.
            setTodaysSchedule(current => [...current.filter(i => i.type !== 'event'), ...allEvents.filter(e => getSortableTime(e) <= todayEnd.getTime())].sort((a,b) => getSortableTime(a) - getSortableTime(b)));
            setWeekEvents(current => [...current.filter(i => i.type !== 'event'), ...allEvents.filter(e => getSortableTime(e) < weekEnd.getTime())]);
            setUpcomingEvents(current => [...current.filter(i => i.type !== 'event'), ...allEvents].sort((a,b) => getSortableTime(a) - getSortableTime(b)));
        });

        return () => {
            unsubLessons();
            unsubEvents();
        }

    }, [db, userId, appId]);

    return (
        <div className="p-4 md:p-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Students</h3>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{students.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Groups</h3>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{groups.length}</p>
                </div>
                <button onClick={() => setIsStudentModalOpen(true)} className="bg-blue-600 text-white p-6 rounded-lg shadow-md hover:bg-blue-700 transition-colors text-left">
                    <h3 className="text-lg font-semibold">Enroll Student</h3>
                    <p className="text-sm opacity-80">Add a new student to the system.</p>
                </button>
                <button onClick={() => setIsEventModalOpen(true)} className="bg-green-600 text-white p-6 rounded-lg shadow-md hover:bg-green-700 transition-colors text-left">
                    <h3 className="text-lg font-semibold">Log Event</h3>
                    <p className="text-sm opacity-80">Add a new event to the calendar.</p>
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-100">Today's Schedule</h3>
                    {todaysSchedule.length > 0 ? (
                        <ul className="space-y-3">
                            {todaysSchedule.map(item => (
                                <li key={item.id} className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full mr-3 ${item.type === 'lesson' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                    <div>
                                        <p className="font-medium text-gray-800 dark:text-gray-200">{item.type === 'lesson' ? item.topic : item.eventName}</p>
                                        <p className="text-sm text-gray-500">{item.type === 'lesson' ? item.lessonDate.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : item.startTime.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">No events or lessons scheduled for today.</p>
                    )}
                </div>
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                     <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-100">Upcoming Events</h3>
                     {upcomingEvents.length > 0 ? (
                        <ul className="space-y-3">
                            {upcomingEvents.slice(0, 5).map((item, index) => (
                                <li key={item.id} className={`p-2 rounded-md flex items-center ${index === 0 ? 'bg-blue-100 dark:bg-blue-900/50' : ''}`}>
                                     <div className={`w-2 h-2 rounded-full mr-3 ${item.type === 'lesson' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                                    <div>
                                        <p className="font-medium text-gray-800 dark:text-gray-200">{item.type === 'lesson' ? item.topic : item.eventName}</p>
                                        <p className="text-sm text-gray-500">{item.type === 'lesson' ? item.lessonDate.toDate().toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit'}) : item.startTime.toDate().toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                     ) : (
                        <p className="text-gray-500">No upcoming events.</p>
                     )}
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-4 text-gray-800 dark:text-gray-100">Weekly Overview</h3>
                <WeeklyOverview events={weekEvents} />
            </div>
            <StudentFormModal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} />
            <EventFormModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} />
        </div>
    );
};

// Component to render the weekly calendar view.
const WeeklyOverview = ({ events }) => {
    // UPDATED: Hours now go from 8:00 to 23:00.
    const hours = Array.from({ length: 16 }, (_, i) => i + 8); 
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // Monday as start of week
    startOfWeek.setHours(0,0,0,0);
    
    const weekDates = Array.from({length: 7}).map((_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        return date;
    });

    const getDayIndex = (date) => (date.getDay() + 6) % 7; // Monday is 0
    const todayIndex = getDayIndex(new Date());
    
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[auto_repeat(7,_minmax(0,_1fr))]">
                {/* Header Row */}
                <div className="row-start-1 col-start-1"></div> {/* Empty corner */}
                {weekDates.map((date, i) => (
                    <div key={i} className={`text-center font-semibold p-2 border-l border-b border-gray-200 dark:border-gray-600 ${i === todayIndex ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
                        <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className="text-xs font-normal">{date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}</div>
                    </div>
                ))}
            
                {/* Time Gutter and Grid Content */}
                <div className="col-start-1 col-span-1 row-start-2 grid" style={{gridTemplateRows: `repeat(${hours.length}, minmax(0, 1fr))`}}>
                     {hours.map(hour => (
                        <div key={hour} className="h-16 text-right pr-2 border-t border-gray-200 dark:border-gray-600 flex items-start justify-end pt-1">
                            {/* UPDATED: Darker color for time increments */}
                            <span className="text-sm text-gray-700 dark:text-gray-300 -mt-2">{`${hour.toString().padStart(2, '0')}:00`}</span>
                        </div>
                    ))}
                </div>
                <div className="col-start-2 col-span-7 row-start-2 grid grid-cols-7 relative" style={{gridTemplateRows: `repeat(${hours.length}, minmax(0, 1fr))`}}>
                    {/* Background Grid Cells */}
                    {Array.from({length: hours.length * 7}).map((_, i) => (
                        <div key={i} className="border-l border-t border-gray-200 dark:border-gray-600"></div>
                    ))}

                    {/* Events */}
                    {events.map(event => {
                        const startTime = event.type === 'lesson' ? event.lessonDate.toDate() : event.startTime.toDate();
                        const endTime = event.type === 'lesson' 
                            ? new Date(startTime.getTime() + 2 * 60 * 60 * 1000) // Assume 2 hours for lessons
                            : (event.endTime ? event.endTime.toDate() : new Date(startTime.getTime() + 1 * 60 * 60 * 1000));
                        
                        const dayIndex = getDayIndex(startTime);
                        
                        const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                        const endHour = endTime.getHours() + endTime.getMinutes() / 60;
                        
                        if (endHour < 8 || startHour > 23) return null;

                        const top = ((Math.max(startHour, 8) - 8) / hours.length) * 100;
                        const height = ((Math.min(endHour, 24) - Math.max(startHour, 8)) / hours.length) * 100;
                        const left = (dayIndex / 7) * 100;
                        const width = (1/7) * 100;

                        return (
                            <div key={event.id} className="absolute p-1 rounded text-white text-xs overflow-hidden mx-px flex flex-col justify-center items-center text-center" 
                                 style={{ 
                                    top: `${top}%`,
                                    height: `${height}%`,
                                    left: `${left}%`,
                                    width: `calc(${width}% - 2px)`,
                                    backgroundColor: event.type === 'lesson' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(16, 185, 129, 0.8)' 
                                 }}>
                                <p className="font-bold truncate w-full">{event.type === 'lesson' ? event.topic : event.eventName}</p>
                                <p className="text-white/80 truncate w-full">{startTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {endTime.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

// Modal for logging a new generic event.
function EventFormModal({ isOpen, onClose }) {
    const { db, userId, appId } = useContext(AppContext);
    const [formData, setFormData] = useState({ eventName: '', startDate: '', startTime: '09:00', endTime: '10:00' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const timeOptions = [];
    for (let h = 8; h <= 23; h++) {
        timeOptions.push(`${h.toString().padStart(2, '0')}:00`);
        timeOptions.push(`${h.toString().padStart(2, '0')}:30`);
    }
    
    useEffect(() => {
        if (isOpen) {
            setFormData({ eventName: '', startDate: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '10:00' });
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const { eventName, startDate, startTime, endTime } = formData;
        
        // Combine date and time strings into Date objects.
        const [startHours, startMinutes] = startTime.split(':');
        const startDateTime = new Date(startDate.replace(/-/g, '/'));
        startDateTime.setHours(startHours, startMinutes);

        const [endHours, endMinutes] = endTime.split(':');
        const endDateTime = new Date(startDate.replace(/-/g, '/'));
        endDateTime.setHours(endHours, endMinutes);

        try {
            const eventsCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'events');
            await addDoc(eventsCollectionPath, {
                eventName,
                startTime: Timestamp.fromDate(startDateTime),
                endTime: Timestamp.fromDate(endDateTime)
            });
            onClose();
        } catch (error) {
            console.error("Error adding event:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Log New Event">
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <FormInput label="Event Name" name="eventName" value={formData.eventName} onChange={handleChange} required />
                    <CustomDatePicker label="Date" name="startDate" value={formData.startDate} onChange={handleChange} />
                    <div className="flex items-center gap-4">
                        <div className="flex-1"><CustomTimePicker label="Start Time" name="startTime" value={formData.startTime} onChange={handleChange} options={timeOptions} /></div>
                        <div className="flex-1"><CustomTimePicker label="End Time" name="endTime" value={formData.endTime} onChange={handleChange} options={timeOptions} /></div>
                    </div>
                </div>
                <div className="flex justify-end pt-8 mt-8 border-t dark:border-gray-700 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300 dark:text-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Event'}</button>
                </div>
            </form>
        </Modal>
    );
}


// --- PLACEHOLDER MODULES ---
// These will be replaced with actual implementations later.
const Finances = () => <div className="p-8 text-2xl font-bold text-gray-800 dark:text-gray-200">Finances Module (Under Construction)</div>;
const Documents = () => <div className="p-8 text-2xl font-bold text-gray-800 dark:text-gray-200">Documents Module (Under Construction)</div>;


// --- SettingsModule.js ---
// Component for the "Settings" page.
const SettingsModule = () => {
    const { db, userId, appId } = useContext(AppContext);
    const [isSeeding, setIsSeeding] = useState(false);
    const [seedMessage, setSeedMessage] = useState('');

    // Loads sample data into Firestore for testing purposes.
    const loadSampleData = async () => {
        setIsSeeding(true);
        setSeedMessage('Loading sample data...');
        
        const batch = writeBatch(db);

        // Sample Groups
        const group1 = { groupName: 'A1 Beginners', schedule: { days: ['Mon', 'Wed'], startTime: '18:00', endTime: '20:00' }};
        const group2 = { groupName: 'B2 Intermediate', schedule: { days: ['Tue', 'Thu'], startTime: '19:00', endTime: '21:00' }};
        const group1Ref = doc(collection(db, 'artifacts', appId, 'users', userId, 'groups'));
        const group2Ref = doc(collection(db, 'artifacts', appId, 'users', userId, 'groups'));
        batch.set(group1Ref, group1);
        batch.set(group2Ref, group2);

        // Sample Students
        const students = [
            { fullName: 'Ayşe Yılmaz', studentContact: '555-0101', groupId: group1Ref.id, isTutoring: false, enrollmentDate: Timestamp.now() },
            { fullName: 'Mehmet Kaya', studentContact: '555-0102', groupId: group1Ref.id, isTutoring: false, enrollmentDate: Timestamp.now() },
            { fullName: 'Fatma Demir', studentContact: '555-0103', groupId: group2Ref.id, isTutoring: false, enrollmentDate: Timestamp.now() },
            { fullName: 'Ali Vural', studentContact: '555-0104', groupId: group2Ref.id, isTutoring: false, enrollmentDate: Timestamp.now() },
            { fullName: 'Zeynep Çelik', studentContact: '555-0105', isTutoring: true, tutoringDetails: { hourlyRate: 250, schedule: { days: ['Fri'], startTime: '14:00', endTime: '15:00' } }, enrollmentDate: Timestamp.now() },
        ];
        students.forEach(student => {
            const studentRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'students'));
            batch.set(studentRef, student);
        });
        
        // Sample Lessons
        const lessons = [
            { topic: 'Introduction & Greetings', groupId: group1Ref.id, lessonDate: Timestamp.fromDate(new Date()) },
            { topic: 'Present Tense', groupId: group1Ref.id, lessonDate: Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)) },
            { topic: 'Advanced Conditionals', groupId: group2Ref.id, lessonDate: Timestamp.fromDate(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)) },
        ];
        lessons.forEach(lesson => {
            const lessonRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'lessons'));
            batch.set(lessonRef, {...lesson, attendance: {}});
        });

        try {
            await batch.commit();
            setSeedMessage('Sample data loaded successfully!');
        } catch (error) {
            setSeedMessage('Error loading data. See console for details.');
            console.error("Error seeding data: ", error);
        } finally {
            setIsSeeding(false);
        }
    };

    return (
        <div className="p-4 md:p-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6">Settings</h2>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-semibold mb-4">Test Data</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Click the button below to load sample students, groups, and lessons into the system. This is useful for testing new features without entering data manually.
                </p>
                <button 
                    onClick={loadSampleData} 
                    disabled={isSeeding}
                    className="px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                    {isSeeding ? 'Loading...' : 'Load Sample Data'}
                </button>
                {seedMessage && <p className={`mt-4 text-sm text-gray-600 dark:text-gray-300`}>{seedMessage}</p>}
            </div>
        </div>
    );
};


// --- LAYOUT COMPONENTS ---
// The main sidebar navigation component.
const Sidebar = ({ currentPage, setCurrentPage, isSidebarOpen }) => {
    const NavItem = ({ icon, label, pageName }) => ( <li onClick={() => setCurrentPage(pageName)} className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors ${ currentPage === pageName ? 'bg-slate-700 text-white shadow-lg' : 'text-gray-300 hover:bg-slate-700/50'}`}><Icon path={icon} /><span className="ml-4 font-medium">{label}</span></li> );
    return (
        <aside className={`absolute md:relative z-30 md:z-auto flex-shrink-0 w-64 bg-slate-800 transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
            <div className="flex flex-col h-full">
                <div className="flex items-center justify-center h-20 border-b border-slate-700 px-4">
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-white">Ünlü Dil</h2>
                        <p className="text-xs text-slate-400">Kurs Yönetim Sistemi</p>
                    </div>
                </div>
                <nav className="flex-1 p-4">
                    <ul>
                        <NavItem icon={ICONS.DASHBOARD} label="Dashboard" pageName="dashboard" />
                        <NavItem icon={ICONS.STUDENTS} label="Students" pageName="students" />
                        <NavItem icon={ICONS.GROUPS} label="Groups" pageName="groups" />
                        <NavItem icon={ICONS.FINANCES} label="Finances" pageName="finances" />
                        <NavItem icon={ICONS.DOCUMENTS} label="Documents" pageName="documents" />
                        <NavItem icon={ICONS.SETTINGS} label="Settings" pageName="settings" />
                    </ul>
                </nav>
            </div>
        </aside>
    );
};

// The header component, containing the theme toggle and mobile sidebar button.
const Header = ({ toggleSidebar }) => {
    const { isDarkMode, toggleTheme } = useContext(ThemeContext);
    return (
        <header className="flex items-center justify-between md:justify-end h-16 px-6 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex-shrink-0">
            <button onClick={toggleSidebar} className="md:hidden text-gray-500 dark:text-gray-400">
                <Icon path={ICONS.MENU} />
            </button>
            <div className="flex items-center space-x-4">
                <button onClick={toggleTheme} className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <Icon path={isDarkMode ? ICONS.SUN : ICONS.MOON} />
                </button>
            </div>
        </header>
    );
};

// The main content area that renders the currently selected page.
const MainContent = ({ currentPage }) => {
    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <DashboardModule />;
            case 'students': return <StudentsModule />;
            case 'groups': return <GroupsModule />;
            case 'finances': return <Finances />;
            case 'documents': return <Documents />;
            case 'settings': return <SettingsModule />;
            default: return <DashboardModule />;
        }
    };
    return <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-900">{renderPage()}</main>;
};

// --- MAIN APP COMPONENT ---
export default function App() {
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [authReady, setAuthReady] = useState(false);
    const [user, setUser] = useState(null);
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const [groups, setGroups] = useState([]);
    const [students, setStudents] = useState([]);

    // Handles Firebase authentication on initial load.
    useEffect(() => {
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        const authSignIn = async () => {
            try {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Authentication failed:", error);
            }
        };
        authSignIn();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    // Fetches global data (groups and students) once the user is authenticated.
    // This data is passed down through context to avoid redundant fetches in child components.
    useEffect(() => {
        if (!user) return;
        const groupsCollectionPath = collection(db, 'artifacts', appId, 'users', user.uid, 'groups');
        const unsubGroups = onSnapshot(groupsCollectionPath, (snapshot) => {
            const groupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGroups(groupsData);
        });

        const studentsCollectionPath = collection(db, 'artifacts', appId, 'users', user.uid, 'students');
        const unsubStudents = onSnapshot(studentsCollectionPath, (snapshot) => {
            const studentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStudents(studentsData);
        });

        return () => {
            unsubGroups();
            unsubStudents();
        };
    }, [user, db, appId]);

    // Display a loading screen until Firebase auth is ready.
    if (!authReady || !user) {
        return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><div className="text-2xl font-semibold text-gray-700 dark:text-gray-300">Loading System...</div></div>;
    }

    return (
        <AppContext.Provider value={{ db, storage, auth, userId: user.uid, appId, groups, students }}>
            <ThemeProvider>
                <div className="flex h-screen font-sans text-gray-900 bg-gray-100 dark:bg-gray-900 dark:text-white">
                    <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} isSidebarOpen={isSidebarOpen}/>
                    <div className="flex flex-col flex-1 min-w-0">
                        <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                        <MainContent currentPage={currentPage} />
                    </div>
                </div>
            </ThemeProvider>
        </AppContext.Provider>
    );
}
