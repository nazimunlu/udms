import React, { useState, useEffect, createContext, useContext, useCallback, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, setLogLevel, collection, onSnapshot, addDoc, doc, setDoc, deleteDoc, Timestamp, query, where, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, Sector } from 'recharts';


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
    SETTINGS: "M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69-.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19-.15-.24-.42.12-.64l2 3.46c.12-.22.39.3.61-.22l2.49-1c.52.4 1.08.73 1.69-.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59-1.69-.98l2.49 1c.23.09.49 0 .61-.22l2 3.46c.12-.22-.07.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z",
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
    BUILDING: "M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z",
    SHOPPING_CART: "M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z",
    EYE: "M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z",
    EYE_OFF: "M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 9.93 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z",
    DOWNLOAD: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z",
    UPLOAD: "M9 16h6v-6h4l-8-8-8 8h4v6zm-4 2h14v2H5v-2z",
    INFO: "M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z",
    CAKE: "M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2zm6 3h-5.07c-.09-.24-.19-.48-.29-.71L12 7l-.64 1.29c-.1.23-.2.47-.29.71H6c-1.1 0-2 .9-2 2v9c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-9c0-1.1-.9-2-2-2zm-6 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z",
};

// --- FIREBASE CONFIGURATION ---
const firebaseConfigString = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
let firebaseConfig = {};
try {
    firebaseConfig = JSON.parse(firebaseConfigString);
} catch (e) {
    console.error("Could not parse Firebase config:", e);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- APP CONTEXT ---
const AppContext = createContext();

// --- HOOKS ---
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
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                    {typeof title === 'string' ? (
                        <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                    ) : (
                        <div>{title}</div>
                    )}
                    <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-200"><Icon path={ICONS.CLOSE} /></button>
                </div>
                <div className="p-6 overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <p className="text-gray-700 mb-6">{message}</p>
            <div className="flex justify-end space-x-4">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700">Confirm</button>
            </div>
        </Modal>
    );
};

const FormInput = ({ label, icon, ...props }) => (
    <div>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <div className="relative">
            <input {...props} className={`block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${icon ? 'pr-10' : ''}`} />
            {icon && <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">{icon}</span>}
        </div>
    </div>
);

const FormSelect = ({ label, children, ...props }) => (
     <div>
        {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        <select {...props} className="block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
            {children}
        </select>
    </div>
);

const FormSection = ({ title, children }) => (
    <fieldset className="mt-6 border-t border-gray-200 pt-6">
        <legend className="text-lg font-medium text-gray-900">{title}</legend>
        <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">{children}</div>
    </fieldset>
);

const CustomDatePicker = ({ label, value, onChange, name }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    const getInitialDate = (v) => {
        if (v && typeof v.toDate === 'function') return v.toDate();
        if (v instanceof Date) return v;
        if (typeof v === 'string' && v) return new Date(v.replace(/-/g, '/'));
        return new Date();
    };

    const [displayDate, setDisplayDate] = useState(getInitialDate(value));
    const pickerRef = useRef(null);
    useClickOutside(pickerRef, () => setIsOpen(false));

    useEffect(() => {
        setDisplayDate(getInitialDate(value));
    }, [value, isOpen]);

    const daysOfWeek = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const getFirstDayOfMonth = (date) => {
        const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
        return (day + 6) % 7; 
    };

    const firstDayOfMonth = getFirstDayOfMonth(displayDate);
    const daysInMonth = new Date(displayDate.getFullYear(), displayDate.getMonth() + 1, 0).getDate();

    const changeMonth = (offset) => {
        setDisplayDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const handleSelectDate = (day) => {
        const selected = new Date(displayDate.getFullYear(), displayDate.getMonth(), day);
        const year = selected.getFullYear();
        const month = (selected.getMonth() + 1).toString().padStart(2, '0');
        const date = selected.getDate().toString().padStart(2, '0');
        const dateString = `${year}-${month}-${date}`;
        onChange({ target: { name, value: dateString } });
        setIsOpen(false);
    };

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
                <div className="absolute z-20 mt-1 w-80 bg-white shadow-lg rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <button type="button" onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-gray-100"><Icon path={ICONS.CHEVRON_LEFT} /></button>
                        <span className="font-semibold text-gray-800">{monthNames[displayDate.getMonth()]} {displayDate.getFullYear()}</span>
                        <button type="button" onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-gray-100"><Icon path={ICONS.CHEVRON_RIGHT} /></button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-sm">
                        {daysOfWeek.map(day => <div key={day} className="font-medium text-gray-500">{day}</div>)}
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
                                     isToday ? 'bg-blue-200 text-blue-700' : 
                                     'text-gray-700 hover:bg-gray-100'}`}>
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
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md max-h-60 overflow-auto border border-gray-200">
                    <ul className="py-1">
                        {options.map(option => (
                            <li key={option} onClick={() => handleSelect(option)} className="px-3 py-2 text-sm text-gray-700 hover:bg-blue-500 hover:text-white cursor-pointer">
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
const StudentFormModal = ({ isOpen, onClose, studentToEdit }) => {
    const { db, storage, userId, appId, groups } = useContext(AppContext);
    
    const timeOptions = [];
    for (let h = 9; h <= 23; h++) {
        timeOptions.push(`${h.toString().padStart(2, '0')}:00`);
        timeOptions.push(`${h.toString().padStart(2, '0')}:30`);
    }
    timeOptions.push('00:00');

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

        return {
            fullName: studentToEdit?.fullName || '',
            studentContact: studentToEdit?.studentContact || '',
            parentContact: studentToEdit?.parentContact || '',
            enrollmentDate: getSafeDateString(studentToEdit?.enrollmentDate) || new Date().toISOString().split('T')[0],
            birthDate: getSafeDateString(studentToEdit?.birthDate) || '',
            isTutoring: studentToEdit?.isTutoring || false,
            groupId: studentToEdit?.groupId || null,
            documents: studentToEdit?.documents || { nationalIdUrl: '', agreementUrl: '' },
            feeDetails: studentToEdit?.feeDetails || { totalFee: '12000', numberOfInstallments: '3' },
            tutoringDetails: studentToEdit?.tutoringDetails || {
                hourlyRate: '',
                endDate: '',
                schedule: { days: [], startTime: '09:00', endTime: '10:00' }
            },
            installments: studentToEdit?.installments || []
        };
    }, [studentToEdit]);

    const [formData, setFormData] = useState(getInitialFormData());
    const [files, setFiles] = useState({ nationalId: null, agreement: null });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState(null);
    
    useEffect(() => {
        if (isOpen) {
            setFormData(getInitialFormData());
            setFiles({ nationalId: null, agreement: null });
            setStatusMessage(null);
        }
    }, [isOpen, getInitialFormData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
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

    const uploadFile = async (file, path) => {
        if (!file) return null;
        const storageRef = ref(storage, path);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatusMessage(null);
        let dataToSave = { ...formData };
        
        if (!dataToSave.isTutoring) {
            const totalFee = parseFloat(dataToSave.feeDetails.totalFee) || 0;
            const numInstallments = parseInt(dataToSave.feeDetails.numberOfInstallments, 10) || 1;
            const installmentAmount = totalFee / numInstallments;
            const startDate = new Date(dataToSave.enrollmentDate.replace(/-/g, '/'));
            
            dataToSave.installments = [];
            for (let i = 0; i < numInstallments; i++) {
                const dueDate = new Date(startDate);
                dueDate.setMonth(startDate.getMonth() + i);
                dataToSave.installments.push({
                    number: i + 1,
                    amount: installmentAmount,
                    dueDate: Timestamp.fromDate(dueDate),
                    status: 'Unpaid'
                });
            }
        } else {
            dataToSave.installments = [];
        }


        try {
            const nationalIdUrl = await uploadFile(files.nationalId, `artifacts/${appId}/users/${userId}/students/${Date.now()}_nationalId`);
            const agreementUrl = await uploadFile(files.agreement, `artifacts/${appId}/users/${userId}/students/${Date.now()}_agreement`);
            if(nationalIdUrl) dataToSave.documents.nationalIdUrl = nationalIdUrl;
            if(agreementUrl) dataToSave.documents.agreementUrl = agreementUrl;
            
            const toTimestamp = (dateString) => {
                if (!dateString || typeof dateString !== 'string') return null;
                const [year, month, day] = dateString.split('-').map(Number);
                return Timestamp.fromDate(new Date(year, month - 1, day));
            };

            dataToSave.enrollmentDate = toTimestamp(dataToSave.enrollmentDate);
            dataToSave.birthDate = toTimestamp(dataToSave.birthDate);
            if (dataToSave.tutoringDetails.endDate) {
                dataToSave.tutoringDetails.endDate = toTimestamp(dataToSave.tutoringDetails.endDate);
            } else {
                dataToSave.tutoringDetails.endDate = null;
            }

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
                     <div className="sm:col-span-3">
                        <CustomDatePicker label="Birth Date (Optional)" name="birthDate" value={formData.birthDate} onChange={handleChange} />
                    </div>
                    <div className="sm:col-span-6 flex items-center pt-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" name="isTutoring" checked={formData.isTutoring} onChange={handleChange} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ml-3 text-sm font-medium text-gray-900">Is Tutoring Student?</span>
                        </label>
                    </div>
                </FormSection>

                {formData.isTutoring ? (
                    <FormSection title="Tutoring Details">
                        <div className="sm:col-span-3"><FormInput label="Hourly Rate (₺)" name="hourlyRate" type="number" value={formData.tutoringDetails.hourlyRate} onChange={handleTutoringChange} /></div>
                        <div className="sm:col-span-3"><CustomDatePicker label="End Date" name="endDate" value={formData.tutoringDetails.endDate} onChange={handleTutoringChange} /></div>
                        <div className="sm:col-span-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Recurring Schedule</label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <button type="button" key={day} onClick={() => toggleScheduleDay(day)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${formData.tutoringDetails.schedule.days.includes(day) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="nationalId" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"><span>Upload a file</span><input id="nationalId" name="nationalId" type="file" className="sr-only" onChange={handleFileChange} /></label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500">{files.nationalId ? files.nationalId.name : 'PNG, JPG, PDF up to 10MB'}</p>
                                    </div>
                                </div>
                           </div>
                           <div className="sm:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Agreement</label>
                                 <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                                    <div className="space-y-1 text-center">
                                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="agreement" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"><span>Upload a file</span><input id="agreement" name="agreement" type="file" className="sr-only" onChange={handleFileChange} /></label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500">{files.agreement ? files.agreement.name : 'PNG, JPG, PDF up to 10MB'}</p>
                                    </div>
                                </div>
                           </div>
                        </FormSection>
                    </>
                )}
                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Student'}</button>
                </div>
                {statusMessage && <p className={`mt-4 text-center text-sm ${statusMessage.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{statusMessage.text}</p>}
            </form>
        </Modal>
    );
};


// --- StudentsModule.js ---
const StudentsModule = () => {
    const { db, userId, appId } = useContext(AppContext);
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('group');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [studentToEdit, setStudentToEdit] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [studentToDelete, setStudentToDelete] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [studentToView, setStudentToView] = useState(null);

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
    
    const openDeleteConfirmation = (student) => {
        setStudentToDelete(student);
        setIsConfirmModalOpen(true);
    };

    const handleDeleteStudent = async () => {
        if (!studentToDelete) return;
        try {
            const studentDocRef = doc(db, 'artifacts', appId, 'users', userId, 'students', studentToDelete.id);
            await deleteDoc(studentDocRef);
        } catch (error) {
            console.error("Error deleting student:", error);
        } finally {
            setIsConfirmModalOpen(false);
            setStudentToDelete(null);
        }
    };

    const openAddModal = () => { setStudentToEdit(null); setIsFormModalOpen(true); };
    const openEditModal = (student) => { setStudentToEdit(student); setIsFormModalOpen(true); };
    const openDetailsModal = (student) => { setStudentToView(student); setIsDetailsModalOpen(true); };
    const filteredStudents = students.filter(s => activeTab === 'group' ? !s.isTutoring : s.isTutoring);

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Students</h2>
                <button onClick={openAddModal} className="flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow"><Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>Add Student</button>
            </div>
            <div className="mb-4 border-b border-gray-200">
                <nav className="flex space-x-4" aria-label="Tabs">
                    <button onClick={() => setActiveTab('group')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'group' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Group Students</button>
                    <button onClick={() => setActiveTab('tutoring')} className={`px-3 py-2 font-medium text-sm rounded-t-lg ${activeTab === 'tutoring' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Tutoring Students</button>
                </nav>
            </div>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Full Name</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Contact</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Enrollment Date</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {isLoading ? (
                                <tr><td colSpan="4" className="p-4 text-center text-gray-500">Loading students...</td></tr>
                            ) : filteredStudents.length > 0 ? (
                                filteredStudents.map(student => (
                                    <tr key={student.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-gray-800">{student.fullName}</td>
                                        <td className="p-4 text-gray-600">{student.studentContact}</td>
                                        <td className="p-4 text-gray-600">{student.enrollmentDate?.toDate().toLocaleDateString()}</td>
                                        <td className="p-4">
                                            <div className="flex space-x-2">
                                                <button onClick={() => openDetailsModal(student)} className="p-2 text-gray-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.INFO} className="w-5 h-5" /></button>
                                                <button onClick={() => openEditModal(student)} className="p-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
                                                <button onClick={() => openDeleteConfirmation(student)} className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-gray-200"><Icon path={ICONS.DELETE} className="w-5 h-5" /></button>
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
            {studentToView && <StudentDetailsModal isOpen={isDetailsModalOpen} onClose={() => setIsDetailsModalOpen(false)} student={studentToView} />}
        </div>
    );
};

const StudentDetailsModal = ({ isOpen, onClose, student }) => {
    const { db, userId, appId, groups } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState('general');
    const [lessons, setLessons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!student?.groupId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const lessonsQuery = query(collection(db, 'artifacts', appId, 'users', userId, 'lessons'), where("groupId", "==", student.groupId));
        const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
            const lessonsData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            lessonsData.sort((a,b) => a.lessonDate.toMillis() - b.lessonDate.toMillis());
            setLessons(lessonsData);
            setIsLoading(false);
        });
        return unsubscribe;
    }, [db, userId, appId, student?.groupId]);
    
    const groupName = student.groupId ? groups.find(g => g.id === student.groupId)?.groupName : 'N/A';
    
    const getAttendanceStatus = (status) => {
        const baseClasses = "px-2 py-1 text-xs font-semibold rounded-full";
        switch(status) {
            case 'present': return <span className={`${baseClasses} bg-green-100 text-green-800`}>Present</span>;
            case 'absent': return <span className={`${baseClasses} bg-red-100 text-red-800`}>Absent</span>;
            case 'late': return <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>Late</span>;
            default: return <span className={`${baseClasses} bg-gray-100 text-gray-800`}>N/A</span>;
        }
    };

    const modalTitle = (
        <div>
            <h3 className="text-xl font-bold text-gray-800">{student.fullName}</h3>
            <p className="text-sm text-gray-500">Student Details</p>
        </div>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            <div className="mb-4 border-b border-gray-200">
                <nav className="flex space-x-4" aria-label="Tabs">
                    <button onClick={() => setActiveTab('general')} className={`-mb-px px-3 py-2 font-medium text-sm border-b-2 ${activeTab === 'general' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>General Info</button>
                    <button onClick={() => setActiveTab('payments')} className={`-mb-px px-3 py-2 font-medium text-sm border-b-2 ${activeTab === 'payments' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Payments</button>
                    <button onClick={() => setActiveTab('attendance')} className={`-mb-px px-3 py-2 font-medium text-sm border-b-2 ${activeTab === 'attendance' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Attendance</button>
                </nav>
            </div>
            
            {activeTab === 'general' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="font-medium text-gray-500">Student Contact:</div><div className="text-gray-800">{student.studentContact}</div>
                    <div className="font-medium text-gray-500">Parent Contact:</div><div className="text-gray-800">{student.parentContact || 'N/A'}</div>
                    <div className="font-medium text-gray-500">Enrollment Date:</div><div className="text-gray-800">{student.enrollmentDate?.toDate().toLocaleDateString()}</div>
                    <div className="font-medium text-gray-500">Birth Date:</div><div className="text-gray-800">{student.birthDate ? student.birthDate.toDate().toLocaleDateString() : 'N/A'}</div>
                    <div className="font-medium text-gray-500">Student Type:</div><div className="text-gray-800">{student.isTutoring ? 'Tutoring' : 'Group'}</div>
                    {!student.isTutoring && <><div className="font-medium text-gray-500">Group:</div><div className="text-gray-800">{groupName}</div></>}
                </div>
            )}

            {activeTab === 'payments' && (
                 <ul className="divide-y divide-gray-200">
                    {(student.installments || []).map(inst => (
                        <li key={inst.number} className="py-3 flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-800">Installment #{inst.number}</p>
                                <p className="text-sm text-gray-500">Due: {inst.dueDate.toDate().toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-gray-800">₺{inst.amount.toFixed(2)}</p>
                                {inst.status === 'Paid' ? (
                                     <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Paid</span>
                                ) : (
                                     <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">Unpaid</span>
                                )}
                            </div>
                        </li>
                    ))}
                    {(student.installments || []).length === 0 && <p className="text-center text-gray-500 py-4">No payment plan found for this student.</p>}
                </ul>
            )}

            {activeTab === 'attendance' && (
                isLoading ? <p>Loading attendance...</p> :
                <ul className="divide-y divide-gray-200">
                    {lessons.map(lesson => (
                        <li key={lesson.id} className="py-3 flex justify-between items-center">
                             <div>
                                <p className="font-medium text-gray-800">{lesson.topic}</p>
                                <p className="text-sm text-gray-500">{lesson.lessonDate.toDate().toLocaleDateString()}</p>
                            </div>
                            {getAttendanceStatus(lesson.attendance?.[student.id])}
                        </li>
                    ))}
                    {lessons.length === 0 && <p className="text-center text-gray-500 py-4">No lessons found for this student's group.</p>}
                </ul>
            )}
        </Modal>
    );
};


// --- GroupsModule.js ---
const GroupsModule = () => {
    const { db, userId, appId } = useContext(AppContext);
    const [groups, setGroups] = useState([]);
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [groupToEdit, setGroupToEdit] = useState(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);

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
                <h2 className="text-3xl font-bold text-gray-800">Groups</h2>
                <button onClick={openAddModal} className="flex items-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow"><Icon path={ICONS.ADD} className="w-5 h-5 mr-2"/>Add Group</button>
            </div>
            {isLoading ? (
                <p className="text-center text-gray-500">Loading groups...</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map(group => (
                        <div key={group.id} className="bg-white rounded-lg shadow-md p-6 flex flex-col">
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{group.groupName}</h3>
                            <div className="text-gray-600 mb-4">
                                {group.schedule && group.schedule.days && group.schedule.days.length > 0 && (
                                    <div>{group.schedule.days.join(', ')}: {group.schedule.startTime} - {group.schedule.endTime}</div>
                                )}
                            </div>
                            <div className="flex-grow"></div>
                            <div className="flex justify-between items-center mt-4">
                                <span className="text-sm text-gray-500">{studentCount(group.id)} Students</span>
                                <div className="flex items-center">
                                    <button onClick={() => openDetailsModal(group)} className="text-sm font-medium text-blue-600 hover:underline mr-4">Details</button>
                                    <button onClick={() => openEditModal(group)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-200"><Icon path={ICONS.EDIT} className="w-5 h-5" /></button>
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
                        <div className="flex flex-wrap gap-2 mb-4">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <button type="button" key={day} onClick={() => toggleScheduleDay(day)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${formData.schedule.days.includes(day) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
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
                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Group'}</button>
                </div>
            </form>
        </Modal>
    );
};

const GroupDetailsModal = ({ isOpen, onClose, group, students }) => {
    const { db, userId, appId } = useContext(AppContext);
    const [studentToRemove, setStudentToRemove] = useState(null);
    const [lessons, setLessons] = useState([]);
    const [newLesson, setNewLesson] = useState({ date: '', topic: '' });
    const [lessonToEdit, setLessonToEdit] = useState(null);
    const [lessonToDelete, setLessonToDelete] = useState(null);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [selectedLessonForAttendance, setSelectedLessonForAttendance] = useState(null);

    useEffect(() => {
        if (!group?.id) return;
        const lessonsQuery = query(collection(db, 'artifacts', appId, 'users', userId, 'lessons'), where("groupId", "==", group.id));
        const unsubscribe = onSnapshot(lessonsQuery, (snapshot) => {
            const lessonsData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            lessonsData.sort((a,b) => a.lessonDate.toMillis() - b.lessonDate.toMillis());
            setLessons(lessonsData);
        });
        return unsubscribe;
    }, [db, userId, appId, group?.id]);

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

    const modalTitle = (
        <div>
            <h3 className="text-xl font-bold text-gray-800">{group.groupName}</h3>
            <p className="text-sm text-gray-500">Details</p>
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
                                <ul className="divide-y divide-gray-200">
                                    {lessons.map(lesson => (
                                        <li key={lesson.id} className="py-3 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-800">{lesson.topic}</p>
                                                <p className="text-sm text-gray-500">{lesson.lessonDate.toDate().toLocaleDateString()}</p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <button onClick={() => openAttendanceModal(lesson)} className="text-sm text-gray-500 hover:text-gray-700">Attendance</button>
                                                <button onClick={() => setLessonToEdit(lesson)} className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-200"><Icon path={ICONS.EDIT} className="w-4 h-4" /></button>
                                                <button onClick={() => setLessonToDelete(lesson)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-200"><Icon path={ICONS.DELETE} className="w-4 h-4" /></button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                             ) : (
                                <p className="text-center text-gray-500 py-4">No lessons scheduled for this group yet.</p>
                             )}
                        </div>
                    </FormSection>
                    <FormSection title="Students in this Group">
                        <div className="sm:col-span-6">
                            {students.length > 0 ? (
                                <ul className="divide-y divide-gray-200">
                                    {students.map(student => (
                                        <li key={student.id} className="py-3 flex items-center justify-between">
                                            <span className="text-gray-800">{student.fullName}</span>
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

const AttendanceModal = ({ isOpen, onClose, lesson, students }) => {
    const { db, userId, appId } = useContext(AppContext);
    const [attendance, setAttendance] = useState(lesson.attendance || {});

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
            default: return 'bg-gray-200';
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Attendance for ${lesson.topic} on ${lesson.lessonDate.toDate().toLocaleDateString()}`}>
            <ul className="divide-y divide-gray-200">
                {students.map(student => (
                    <li key={student.id} className="py-4 flex items-center justify-between">
                        <span className="font-medium text-gray-800">{student.fullName}</span>
                        <div className="flex space-x-2">
                            {['present', 'absent', 'late'].map(status => (
                                <button key={status} onClick={() => handleStatusChange(student.id, status)} className={`px-3 py-1 text-sm rounded-full capitalize transition-colors ${attendance[student.id] === status ? getStatusColor(status) : 'bg-gray-200 hover:bg-gray-300'}`}>
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
const DashboardModule = () => {
    const { students, groups, db, userId, appId } = useContext(AppContext);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [todaysSchedule, setTodaysSchedule] = useState([]);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [weekEvents, setWeekEvents] = useState([]);

    useEffect(() => {
        if (!userId || !appId) return;

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
        
        const weekStart = new Date(todayStart);
        const dayOfWeek = weekStart.getDay();
        const diff = weekStart.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); 
        weekStart.setDate(diff);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const getSortableTime = (item) => (item.startTime)?.toMillis() || 0;

        const processAllEvents = () => {
            const allItems = [...(window.lessons || []), ...(window.events || []), ...(window.birthdays || [])];
            
            setTodaysSchedule(allItems.filter(i => getSortableTime(i) >= todayStart.getTime() && getSortableTime(i) <= todayEnd.getTime()).sort((a,b) => getSortableTime(a) - getSortableTime(b)));
            setWeekEvents(allItems.filter(i => getSortableTime(i) >= weekStart.getTime() && getSortableTime(i) < weekEnd.getTime()));
            setUpcomingEvents(allItems.filter(i => getSortableTime(i) >= todayStart.getTime()).sort((a,b) => getSortableTime(a) - getSortableTime(b)));
        };

        const unsubLessons = onSnapshot(query(collection(db, 'artifacts', appId, 'users', userId, 'lessons'), where("lessonDate", ">=", todayStart)), (snapshot) => {
            window.lessons = snapshot.docs.map(doc => ({id: doc.id, type: 'lesson', topic: doc.data().topic, startTime: doc.data().lessonDate }));
            processAllEvents();
        });

        const unsubEvents = onSnapshot(query(collection(db, 'artifacts', appId, 'users', userId, 'events'), where("startTime", ">=", todayStart)), (snapshot) => {
            window.events = snapshot.docs.map(doc => ({id: doc.id, type: 'event', ...doc.data()}));
            processAllEvents();
        });
        
        // Process birthdays from context
        const currentYear = new Date().getFullYear();
        window.birthdays = students.filter(s => s.birthDate).map(s => {
            const birthDate = s.birthDate.toDate();
            let nextBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
            if (nextBirthday < todayStart) {
                nextBirthday.setFullYear(currentYear + 1);
            }
            return {
                id: `bday-${s.id}`,
                type: 'birthday',
                eventName: `${s.fullName}'s Birthday`,
                startTime: Timestamp.fromDate(nextBirthday)
            };
        });
        processAllEvents();


        return () => {
            unsubLessons();
            unsubEvents();
        }

    }, [db, userId, appId, students]);

    return (
        <div className="p-4 md:p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-gray-500 text-sm font-medium">Total Students</h3>
                    <p className="text-3xl font-bold text-gray-800">{students.length}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="text-gray-500 text-sm font-medium">Total Groups</h3>
                    <p className="text-3xl font-bold text-gray-800">{groups.length}</p>
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
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold mb-4 text-gray-800">Today's Schedule</h3>
                    {todaysSchedule.length > 0 ? (
                        <ul className="space-y-3">
                            {todaysSchedule.map(item => (
                                <li key={item.id} className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full mr-3 ${item.type === 'lesson' ? 'bg-blue-500' : item.type === 'birthday' ? 'bg-pink-500' : 'bg-green-500'}`}></div>
                                    <div>
                                        <p className="font-medium text-gray-800">{item.type === 'lesson' ? item.topic : item.eventName}</p>
                                        <p className="text-sm text-gray-500">{item.startTime.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">No events or lessons scheduled for today.</p>
                    )}
                </div>
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                     <h3 className="font-semibold mb-4 text-gray-800">Upcoming Events</h3>
                     {upcomingEvents.length > 0 ? (
                        <ul className="space-y-3">
                            {upcomingEvents.slice(0, 5).map((item, index) => (
                                <li key={item.id} className={`p-2 rounded-md flex items-center ${index === 0 ? 'bg-blue-100' : ''}`}>
                                     <div className={`w-2 h-2 rounded-full mr-3 ${item.type === 'lesson' ? 'bg-blue-500' : item.type === 'birthday' ? 'bg-pink-500' : 'bg-green-500'}`}></div>
                                    <div>
                                        <p className="font-medium text-gray-800">{item.type === 'lesson' ? item.topic : item.eventName}</p>
                                        <p className="text-sm text-gray-500">{item.startTime.toDate().toLocaleDateString([], {weekday: 'long', month: 'long', day: 'numeric'})}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                     ) : (
                        <p className="text-gray-500">No upcoming events.</p>
                     )}
                </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold mb-4 text-gray-800">Weekly Overview</h3>
                <WeeklyOverview events={weekEvents} />
            </div>
            <StudentFormModal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} />
            <EventFormModal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} />
        </div>
    );
};

const WeeklyOverview = ({ events }) => {
    const hours = Array.from({ length: 16 }, (_, i) => i + 8); 
    
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); 
    startOfWeek.setHours(0,0,0,0);
    
    const weekDates = Array.from({length: 7}).map((_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        return date;
    });

    const getDayIndex = (date) => (date.getDay() + 6) % 7; 
    const todayIndex = getDayIndex(new Date());
    
    const getEventColor = (type) => {
        switch(type) {
            case 'lesson': return 'rgb(59, 130, 246)';
            case 'birthday': return 'rgb(236, 72, 153)';
            case 'event': return 'rgb(16, 185, 129)';
            default: return 'rgb(107, 114, 128)';
        }
    }
    
    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="grid grid-cols-[auto_repeat(7,_minmax(0,_1fr))]">
                <div className="row-start-1 col-start-1"></div>
                {weekDates.map((date, i) => (
                    <div key={i} className={`text-center font-semibold p-2 border-l border-b border-gray-200 ${i === todayIndex ? 'text-blue-600' : 'text-gray-600'}`}>
                        <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                        <div className="text-xs font-normal">{date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}</div>
                    </div>
                ))}
            
                <div className="col-start-1 col-span-1 row-start-2 grid" style={{gridTemplateRows: `repeat(${hours.length}, minmax(0, 1fr))`}}>
                     {hours.map(hour => (
                        <div key={hour} className="h-16 text-right pr-2 border-t border-gray-200 flex items-center justify-end">
                            <span className="text-sm text-gray-700">{`${hour.toString().padStart(2, '0')}:00`}</span>
                        </div>
                    ))}
                </div>
                <div className="col-start-2 col-span-7 row-start-2 grid grid-cols-7 relative" style={{gridTemplateRows: `repeat(${hours.length}, minmax(0, 1fr))`}}>
                    {Array.from({length: hours.length * 7}).map((_, i) => (
                        <div key={i} className="border-l border-t border-gray-200"></div>
                    ))}

                    {events.map(event => {
                        const startTime = event.startTime.toDate();
                        const endTime = event.type === 'lesson' 
                            ? new Date(startTime.getTime() + 2 * 60 * 60 * 1000)
                            : (event.endTime ? event.endTime.toDate() : new Date(startTime.getTime() + 1 * 60 * 60 * 1000));
                        
                        const dayIndex = getDayIndex(startTime);
                        
                        const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                        const endHour = endTime.getHours() + endTime.getMinutes() / 60;
                        
                        if (endHour < 8 || startHour > 23 || event.type === 'birthday') return null;

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
                                    backgroundColor: getEventColor(event.type)
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

// --- FinancesModule.js ---
const StudentPaymentDetailsModal = ({ isOpen, onClose, student }) => {
    const { db, userId, appId } = useContext(AppContext);

    if (!student) return null;

    const handleLogPayment = async (installmentNumber) => {
        const studentDocRef = doc(db, 'artifacts', appId, 'users', userId, 'students', student.id);
        
        const updatedInstallments = student.installments.map(inst => {
            if (inst.number === installmentNumber) {
                return { ...inst, status: 'Paid' };
            }
            return inst;
        });

        const installmentToLog = student.installments.find(inst => inst.number === installmentNumber);

        try {
            await updateDoc(studentDocRef, {
                installments: updatedInstallments
            });

            const transactionsCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'transactions');
            await addDoc(transactionsCollectionPath, {
                studentId: student.id,
                studentName: student.fullName,
                amount: installmentToLog.amount,
                date: Timestamp.now(), // Changed from paymentDate to date for consistency
                type: 'income-group',
                description: `Installment #${installmentNumber} for ${student.fullName}`
            });

        } catch (error) {
            console.error("Error logging payment: ", error);
        }
    };
    
    const modalTitle = (
        <div>
            <h3 className="text-xl font-bold text-gray-800">{student.fullName}</h3>
            <p className="text-sm text-gray-500">Payment Details</p>
        </div>
    );
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
            {student.isTutoring ? (
                <div className="space-y-4">
                    <p>Hourly Rate: ₺{student.tutoringDetails?.hourlyRate || 'N/A'}</p>
                    <button className="w-full px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700">
                        Log Tutoring Session Payment
                    </button>
                    <p className="text-center text-gray-500 py-4">Payment history for tutoring sessions will be shown here.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <h4 className="font-semibold">Installment Plan</h4>
                     <ul className="divide-y divide-gray-200">
                        {(student.installments || []).map(inst => (
                            <li key={inst.number} className="py-3 flex justify-between items-center">
                                <div>
                                    <p className="font-medium text-gray-800">Installment #{inst.number}</p>
                                    <p className="text-sm text-gray-500">Due: {inst.dueDate.toDate().toLocaleDateString()}</p>
                                </div>
                                <div className="text-right flex items-center space-x-4">
                                    <div>
                                        <p className="font-semibold text-gray-800">₺{inst.amount.toFixed(2)}</p>
                                        {inst.status === 'Paid' ? (
                                             <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Paid</span>
                                        ) : (
                                             <span className="px-2 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">Unpaid</span>
                                        )}
                                    </div>
                                    {inst.status === 'Unpaid' && (
                                        <button onClick={() => handleLogPayment(inst.number)} className="px-3 py-1 text-sm rounded-lg text-white bg-blue-600 hover:bg-blue-700">
                                            Log Payment
                                        </button>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Modal>
    );
};

const StudentPaymentsView = ({ onStudentSelect }) => {
    const { students } = useContext(AppContext);
    const [activeTab, setActiveTab] = useState('group');
    
    const groupStudents = students.filter(s => !s.isTutoring);
    const tutoringStudents = students.filter(s => s.isTutoring);
    const studentsToShow = activeTab === 'group' ? groupStudents : tutoringStudents;

    return (
        <div className="bg-white rounded-lg shadow-md">
            <div className="p-4 border-b border-gray-200">
                 <h3 className="font-semibold text-xl text-gray-800">Manage Student Payments</h3>
            </div>
            <div className="px-4 border-b border-gray-200">
                <nav className="flex space-x-4" aria-label="Tabs">
                    <button onClick={() => setActiveTab('group')} className={`-mb-px px-3 py-2 font-medium text-sm border-b-2 ${activeTab === 'group' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Group Students</button>
                    <button onClick={() => setActiveTab('tutoring')} className={`-mb-px px-3 py-2 font-medium text-sm border-b-2 ${activeTab === 'tutoring' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Tutoring Students</button>
                </nav>
            </div>
            <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Full Name</th>
                            <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Payment Status</th>
                            <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Next Due Date</th>
                            <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {studentsToShow.length > 0 ? (
                            studentsToShow.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50">
                                    <td className="p-4 text-gray-800">{student.fullName}</td>
                                    <td className="p-4 text-gray-600">
                                        <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">Paid</span>
                                    </td>
                                    <td className="p-4 text-gray-600">N/A</td>
                                    <td className="p-4">
                                        <button onClick={() => onStudentSelect(student)} className="text-sm font-medium text-blue-600 hover:underline">View Details</button>
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
    );
};

const BusinessExpensesView = () => {
    const { db, storage, userId, appId } = useContext(AppContext);
    const [formData, setFormData] = useState({
        category: 'Rent',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        description: '',
    });
    const [invoiceFile, setInvoiceFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState('');
    const [expenses, setExpenses] = useState([]);

    useEffect(() => {
        if (!userId || !appId) return;
        const q = query(collection(db, 'artifacts', appId, 'users', userId, 'transactions'), where("type", "==", "expense-business"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            expensesData.sort((a, b) => b.date.toMillis() - a.date.toMillis());
            setExpenses(expensesData);
        });
        return () => unsubscribe();
    }, [db, userId, appId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setInvoiceFile(e.target.files[0]);
        }
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('');
        
        let invoiceUrl = '';
        try {
            if (invoiceFile) {
                const storageRef = ref(storage, `artifacts/${appId}/users/${userId}/invoices/${Date.now()}_${invoiceFile.name}`);
                await uploadBytes(storageRef, invoiceFile);
                invoiceUrl = await getDownloadURL(storageRef);
            }

            const transactionsCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'transactions');
            await addDoc(transactionsCollectionPath, {
                type: 'expense-business',
                category: formData.category,
                amount: parseFloat(formData.amount),
                date: Timestamp.fromDate(new Date(formData.expenseDate.replace(/-/g, '/'))),
                description: formData.description,
                invoiceUrl: invoiceUrl,
            });

            setFormData({
                category: 'Rent',
                amount: '',
                expenseDate: new Date().toISOString().split('T')[0],
                description: '',
            });
            setInvoiceFile(null);
            document.getElementById('invoice').value = ''; // Clear file input
            setSubmitStatus('Success!');
            setTimeout(() => setSubmitStatus(''), 2000);
            
        } catch (error) {
            console.error("Error logging expense: ", error);
            setSubmitStatus('Error!');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-xl mb-4 text-gray-800">Log Business Expense</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormSelect label="Category" name="category" value={formData.category} onChange={handleChange}>
                        <option>Rent</option>
                        <option>Bills</option>
                        <option>Materials</option>
                        <option>Other</option>
                    </FormSelect>
                    <FormInput label="Amount (₺)" name="amount" type="number" placeholder="e.g., 500.00" value={formData.amount} onChange={handleChange} required />
                    <CustomDatePicker label="Expense Date" name="expenseDate" value={formData.expenseDate} onChange={handleChange} />
                    <FormInput label="Description" name="description" placeholder="e.g., Office supplies" value={formData.description} onChange={handleChange} required />
                    <div>
                         <label className="block text-sm font-medium text-gray-700 mb-1">Invoice (Optional)</label>
                         <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                                <div className="flex text-sm text-gray-600">
                                    <label htmlFor="invoice" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"><span>Upload a file</span><input id="invoice" name="invoice" type="file" className="sr-only" onChange={handleFileChange} /></label>
                                    <p className="pl-1">or drag and drop</p>
                                </div>
                                <p className="text-xs text-gray-500">{invoiceFile ? invoiceFile.name : 'PNG, JPG, PDF up to 10MB'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="pt-4">
                         <button type="submit" disabled={isSubmitting} className="w-full px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 transition-colors">
                            {isSubmitting ? 'Logging...' : (submitStatus || 'Log Expense')}
                        </button>
                    </div>
                </form>
            </div>
            <div className="bg-white rounded-lg shadow-md">
                <h3 className="font-semibold text-xl p-6 border-b border-gray-200">Logged Expenses</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Date</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Category</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Description</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase text-right">Amount</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Invoice</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {expenses.length > 0 ? (
                                expenses.map(expense => (
                                    <tr key={expense.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-gray-600">{expense.date.toDate().toLocaleDateString()}</td>
                                        <td className="p-4 text-gray-800">{expense.category}</td>
                                        <td className="p-4 text-gray-800">{expense.description}</td>
                                        <td className="p-4 text-gray-800 font-semibold text-right">₺{expense.amount.toFixed(2)}</td>
                                        <td className="p-4">
                                            {expense.invoiceUrl ? (
                                                <a href={expense.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-blue-600 hover:underline">View</a>
                                            ) : 'N/A'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="5" className="p-4 text-center text-gray-500">No business expenses logged yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const PersonalExpensesView = () => {
    const { db, userId, appId } = useContext(AppContext);
    const [formData, setFormData] = useState({
        category: 'Food',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        description: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState('');
    const [expenses, setExpenses] = useState([]);

    useEffect(() => {
        if (!userId || !appId) return;
        const q = query(collection(db, 'artifacts', appId, 'users', userId, 'transactions'), where("type", "==", "expense-personal"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            expensesData.sort((a, b) => b.date.toMillis() - a.date.toMillis());
            setExpenses(expensesData);
        });
        return () => unsubscribe();
    }, [db, userId, appId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('');
        
        try {
            const transactionsCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'transactions');
            await addDoc(transactionsCollectionPath, {
                type: 'expense-personal',
                category: formData.category,
                amount: parseFloat(formData.amount),
                date: Timestamp.fromDate(new Date(formData.expenseDate.replace(/-/g, '/'))),
                description: formData.description,
            });

            setFormData({
                category: 'Food',
                amount: '',
                expenseDate: new Date().toISOString().split('T')[0],
                description: '',
            });
            setSubmitStatus('Success!');
            setTimeout(() => setSubmitStatus(''), 2000);
            
        } catch (error) {
            console.error("Error logging expense: ", error);
            setSubmitStatus('Error!');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-xl mb-4 text-gray-800">Log Personal Expense</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <FormSelect label="Category" name="category" value={formData.category} onChange={handleChange}>
                        <option>Food</option>
                        <option>Clothing</option>
                        <option>Subscriptions</option>
                        <option>Other</option>
                    </FormSelect>
                    <FormInput label="Amount (₺)" name="amount" type="number" placeholder="e.g., 150.00" value={formData.amount} onChange={handleChange} required />
                    <CustomDatePicker label="Expense Date" name="expenseDate" value={formData.expenseDate} onChange={handleChange} />
                    <FormInput label="Description" name="description" placeholder="e.g., Weekly groceries" value={formData.description} onChange={handleChange} required />
                    <div className="pt-4">
                         <button type="submit" disabled={isSubmitting} className="w-full px-4 py-2 rounded-lg text-white bg-yellow-500 hover:bg-yellow-600 disabled:bg-yellow-300 transition-colors">
                            {isSubmitting ? 'Logging...' : (submitStatus || 'Log Expense')}
                        </button>
                    </div>
                </form>
            </div>
            <div className="bg-white rounded-lg shadow-md">
                <h3 className="font-semibold text-xl p-6 border-b border-gray-200">Logged Expenses</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Date</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Category</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase">Description</th>
                                <th className="p-4 font-semibold text-sm text-gray-600 uppercase text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {expenses.length > 0 ? (
                                expenses.map(expense => (
                                    <tr key={expense.id} className="hover:bg-gray-50">
                                        <td className="p-4 text-gray-600">{expense.date.toDate().toLocaleDateString()}</td>
                                        <td className="p-4 text-gray-800">{expense.category}</td>
                                        <td className="p-4 text-gray-800">{expense.description}</td>
                                        <td className="p-4 text-gray-800 font-semibold text-right">₺{expense.amount.toFixed(2)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="4" className="p-4 text-center text-gray-500">No personal expenses logged yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const FinancialOverview = ({ transactions, isDataHidden, formatCurrency }) => {
    const PIE_COLORS = {
        'income-group': '#3b82f6', // blue-500
        'income-tutoring': '#10b981', // emerald-500
        'expense-business': '#ef4444', // red-500
        'expense-personal': '#f59e0b', // amber-500
    };
    
    const incomeSourceColors = [PIE_COLORS['income-group'], PIE_COLORS['income-tutoring']];
    const expenseBreakdownColors = [PIE_COLORS['expense-business'], PIE_COLORS['expense-personal']];

    const processedData = useMemo(() => {
        let totalIncome = 0;
        let totalExpenses = 0;
        const incomeSources = { 'income-group': 0, 'income-tutoring': 0 };
        const expenseBreakdown = { 'expense-business': 0, 'expense-personal': 0 };
        const monthlySummary = {};

        transactions.forEach(t => {
            const amount = t.amount || 0;
            const month = t.date.toDate().toLocaleString('en-US', { month: 'short', year: 'numeric' });
            
            if (!monthlySummary[month]) {
                monthlySummary[month] = { name: month, income: 0, expenses: 0 };
            }

            if (t.type.startsWith('income')) {
                totalIncome += amount;
                incomeSources[t.type] = (incomeSources[t.type] || 0) + amount;
                monthlySummary[month].income += amount;
            } else if (t.type.startsWith('expense')) {
                totalExpenses += amount;
                expenseBreakdown[t.type] = (expenseBreakdown[t.type] || 0) + amount;
                monthlySummary[month].expenses += amount;
            }
        });

        const incomeSourceData = Object.entries(incomeSources)
            .map(([key, value]) => ({ name: key === 'income-group' ? 'Group' : 'Tutoring', value }))
            .filter(d => d.value > 0);

        const expenseBreakdownData = Object.entries(expenseBreakdown)
            .map(([key, value]) => ({ name: key === 'expense-business' ? 'Business' : 'Personal', value }))
            .filter(d => d.value > 0);

        return {
            totalIncome,
            totalExpenses,
            incomeSourceData,
            expenseBreakdownData,
            monthlySummaryData: Object.values(monthlySummary).reverse(),
        };
    }, [transactions]);

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
                {`${name} (${(percent * 100).toFixed(0)}%)`}
            </text>
        );
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Total Income</h3>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(processedData.totalIncome)}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Total Expenses</h3>
                    <p className="text-3xl font-bold text-red-600">{formatCurrency(processedData.totalExpenses)}</p>
                </div>
                 <div className="bg-white p-6 rounded-lg shadow-md text-center">
                    <h3 className="text-gray-500 text-sm font-medium uppercase">Net Profit</h3>
                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(processedData.totalIncome - processedData.totalExpenses)}</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h3 className="font-semibold text-xl mb-4 text-gray-800">Income vs. Expenses</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={processedData.monthlySummaryData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis tickFormatter={(value) => isDataHidden ? '₺----' : `₺${value.toLocaleString()}`} />
                            <Tooltip formatter={(value) => formatCurrency(value)} />
                            <Legend />
                            <Bar dataKey="income" fill="#16a34a" />
                            <Bar dataKey="expenses" fill="#dc2626" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-xl mb-4 text-gray-800">Income Sources</h3>
                    <div style={{ width: '100%', height: 300 }}>
                         <ResponsiveContainer>
                            <PieChart>
                                <Pie data={processedData.incomeSourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} fill="#8884d8" labelLine={false} label={renderCustomizedLabel}>
                                    {processedData.incomeSourceData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={incomeSourceColors[index % incomeSourceColors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h3 className="font-semibold text-xl mb-4 text-gray-800">Expense Breakdown</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={processedData.expenseBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} fill="#8884d8" labelLine={false} label={renderCustomizedLabel}>
                                    {processedData.expenseBreakdownData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={expenseBreakdownColors[index % expenseBreakdownColors.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};


const FinancesModule = () => {
    const { students, db, userId, appId } = useContext(AppContext);
    const [activeView, setActiveView] = useState('main');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dateRange, setDateRange] = useState('ytd');
    const [isDataHidden, setIsDataHidden] = useState(false);

    useEffect(() => {
        if (!userId || !appId) return;
        setIsLoading(true);
        const transactionsCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'transactions');
        const unsubscribe = onSnapshot(transactionsCollectionPath, (snapshot) => {
            const transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(transactionsData);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching transactions:", error);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [db, userId, appId]);

    useEffect(() => {
        if (selectedStudent) {
            const updatedStudent = students.find(s => s.id === selectedStudent.id);
            if (updatedStudent) {
                setSelectedStudent(updatedStudent);
            }
        }
    }, [students, selectedStudent]);

    const handleStudentSelect = (student) => {
        setSelectedStudent(student);
    };

    const handleCloseModal = () => {
        setSelectedStudent(null);
    };
    
    const formatCurrency = (value) => {
        if (isDataHidden) return '₺--.--';
        return `₺${(value || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const filteredTransactions = useMemo(() => {
        const now = new Date();
        let startDate = new Date(0);

        switch (dateRange) {
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case '3months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                break;
            case '6months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
                break;
            case 'year':
                 startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                break;
            case 'ytd':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default: // all time
                startDate = new Date(0);
        }
        const startTimestamp = startDate.getTime();
        return transactions.filter(t => t.date.toMillis() >= startTimestamp);
    }, [dateRange, transactions]);

    const renderContent = () => {
        if (isLoading) {
            return <p className="text-center text-gray-500 py-8">Loading financial data...</p>;
        }
        switch (activeView) {
            case 'studentPayments':
                return <StudentPaymentsView onStudentSelect={handleStudentSelect} />;
            case 'businessExpenses':
                return <BusinessExpensesView />;
            case 'personalExpenses':
                return <PersonalExpensesView />;
            default:
                return (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                            <button onClick={() => setActiveView('studentPayments')} className="flex items-center justify-center text-left p-6 bg-white rounded-lg shadow-md hover:shadow-lg hover:bg-gray-50 transition-all">
                                <Icon path={ICONS.STUDENTS} className="w-8 h-8 mr-4 text-blue-500"/>
                                <h3 className="font-semibold text-xl text-gray-800">Student Payments</h3>
                            </button>
                            <button onClick={() => setActiveView('businessExpenses')} className="flex items-center justify-center text-left p-6 bg-white rounded-lg shadow-md hover:shadow-lg hover:bg-gray-50 transition-all">
                                <Icon path={ICONS.BUILDING} className="w-8 h-8 mr-4 text-green-500"/>
                                <h3 className="font-semibold text-xl text-gray-800">Business Expenses</h3>
                            </button>
                             <button onClick={() => setActiveView('personalExpenses')} className="flex items-center justify-center text-left p-6 bg-white rounded-lg shadow-md hover:shadow-lg hover:bg-gray-50 transition-all">
                                <Icon path={ICONS.SHOPPING_CART} className="w-8 h-8 mr-4 text-yellow-500"/>
                                <h3 className="font-semibold text-xl text-gray-800">Personal Expenses</h3>
                            </button>
                        </div>
                         <FinancialOverview transactions={filteredTransactions} isDataHidden={isDataHidden} formatCurrency={formatCurrency} />
                    </>
                );
        }
    };

    const dateFilters = [
        { key: 'month', label: 'This Month' },
        { key: '3months', label: 'Last 3 Months' },
        { key: '6months', label: 'Last 6 Months' },
        { key: 'ytd', label: 'Year to Date' },
        { key: 'year', label: 'Last Year' },
        { key: 'all', label: 'All Time' },
    ];

    return (
        <div className="p-4 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center">
                    {activeView !== 'main' && (
                        <button onClick={() => setActiveView('main')} className="p-2 rounded-full hover:bg-gray-200 mr-4">
                            <Icon path={ICONS.CHEVRON_LEFT} className="w-6 h-6" />
                        </button>
                    )}
                    <h2 className="text-3xl font-bold text-gray-800">Finances</h2>
                </div>
                {activeView === 'main' && (
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Hide Monetary Data</span>
                        <button onClick={() => setIsDataHidden(!isDataHidden)} className={`p-1.5 rounded-full transition-colors ${isDataHidden ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                           {isDataHidden ? <Icon path={ICONS.EYE_OFF} className="w-5 h-5"/> : <Icon path={ICONS.EYE} className="w-5 h-5"/>}
                        </button>
                    </div>
                )}
            </div>

            {activeView === 'main' && (
                <div className="mb-6 flex flex-wrap gap-2">
                    {dateFilters.map(filter => (
                        <button 
                            key={filter.key} 
                            onClick={() => setDateRange(filter.key)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors ${dateRange === filter.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 shadow-sm'}`}
                        >
                            {filter.label}
                        </button>
                    ))}
                </div>
            )}

            {renderContent()}
            {selectedStudent && (
                <StudentPaymentDetailsModal 
                    isOpen={!!selectedStudent} 
                    onClose={handleCloseModal} 
                    student={selectedStudent} 
                />
            )}
        </div>
    );
};


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
                <div className="flex justify-end pt-8 mt-8 border-t border-gray-200 space-x-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 rounded-lg text-gray-700 bg-gray-200 hover:bg-gray-300">Cancel</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">{isSubmitting ? 'Saving...' : 'Save Event'}</button>
                </div>
            </form>
        </Modal>
    );
}

const DocumentsModule = () => {
    const { db, storage, userId, appId, students } = useContext(AppContext);
    const [transactions, setTransactions] = useState([]);
    const [mebDocs, setMebDocs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [docToDelete, setDocToDelete] = useState(null);

    // Fetch finance and MEB documents
    useEffect(() => {
        if (!userId || !appId) return;
        
        const transQuery = query(collection(db, 'artifacts', appId, 'users', userId, 'transactions'), where("invoiceUrl", "!=", ""));
        const mebQuery = collection(db, 'artifacts', appId, 'users', userId, 'mebDocuments');

        const unsubTransactions = onSnapshot(transQuery, snapshot => {
            setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        });
        
        const unsubMeb = onSnapshot(mebQuery, snapshot => {
            setMebDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        });

        return () => {
            unsubTransactions();
            unsubMeb();
        };
    }, [db, userId, appId]);

    const handleDelete = async () => {
        if (!docToDelete) return;
        
        const { type, id, url } = docToDelete;
        
        try {
            // Delete file from storage
            const fileRef = ref(storage, url);
            await deleteObject(fileRef);

            // Delete reference from Firestore
            if (type === 'student') {
                const { studentId, docType } = docToDelete;
                const studentDocRef = doc(db, 'artifacts', appId, 'users', userId, 'students', studentId);
                await updateDoc(studentDocRef, { [`documents.${docType}`]: '' });
            } else if (type === 'finance') {
                const transactionDocRef = doc(db, 'artifacts', appId, 'users', userId, 'transactions', id);
                await updateDoc(transactionDocRef, { invoiceUrl: '' });
            } else if (type === 'meb') {
                const mebDocRef = doc(db, 'artifacts', appId, 'users', userId, 'mebDocuments', id);
                await deleteDoc(mebDocRef);
            }
        } catch (error) {
            console.error("Error deleting document:", error);
        } finally {
            setDocToDelete(null);
        }
    };

    const studentDocs = students
        .filter(s => s.documents?.nationalIdUrl || s.documents?.agreementUrl)
        .flatMap(s => {
            const docs = [];
            if (s.documents.nationalIdUrl) docs.push({ studentId: s.id, studentName: s.fullName, docType: 'nationalIdUrl', name: `${s.fullName} - National ID`, url: s.documents.nationalIdUrl });
            if (s.documents.agreementUrl) docs.push({ studentId: s.id, studentName: s.fullName, docType: 'agreementUrl', name: `${s.fullName} - Agreement`, url: s.documents.agreementUrl });
            return docs;
        });

    return (
        <div className="p-4 md:p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Documents</h2>
            <div className="space-y-8">
                <DocumentCategory title="Student Documents" documents={studentDocs} onDelete={(doc) => setDocToDelete({ ...doc, type: 'student' })} />
                <DocumentCategory title="Finance Documents (Invoices)" documents={transactions.map(t => ({...t, name: t.description, url: t.invoiceUrl}))} onDelete={(doc) => setDocToDelete({ ...doc, type: 'finance' })} />
                <MebDocumentsCategory mebDocs={mebDocs} onDelete={(doc) => setDocToDelete({ ...doc, type: 'meb' })} />
            </div>
            {docToDelete && (
                <ConfirmationModal
                    isOpen={!!docToDelete}
                    onClose={() => setDocToDelete(null)}
                    onConfirm={handleDelete}
                    title="Delete Document"
                    message={`Are you sure you want to delete "${docToDelete.name}"? This action is permanent.`}
                />
            )}
        </div>
    );
};

const DocumentCategory = ({ title, documents, onDelete }) => (
    <div className="bg-white rounded-lg shadow-md">
        <h3 className="font-semibold text-xl p-4 md:p-6 border-b border-gray-200 text-gray-800">{title}</h3>
        {documents.length > 0 ? (
            <ul className="divide-y divide-gray-200">
                {documents.map((doc, index) => (
                    <li key={doc.id || index} className="p-4 flex justify-between items-center hover:bg-gray-50">
                        <span className="text-gray-700 font-medium">{doc.name}</span>
                        <div className="flex space-x-2">
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-200"><Icon path={ICONS.EYE} className="w-5 h-5" /></a>
                            <a href={doc.url} download className="p-2 text-gray-500 hover:text-green-600 rounded-full hover:bg-gray-200"><Icon path={ICONS.DOWNLOAD} className="w-5 h-5" /></a>
                            <button onClick={() => onDelete(doc)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-200"><Icon path={ICONS.DELETE} className="w-5 h-5" /></button>
                        </div>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="p-6 text-gray-500">No documents found in this category.</p>
        )}
    </div>
);

const MebDocumentsCategory = ({ mebDocs, onDelete }) => {
    const { storage, db, userId, appId } = useContext(AppContext);
    const [file, setFile] = useState(null);
    const [docName, setDocName] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            if (!docName) {
                setDocName(selectedFile.name.replace(/\.[^/.]+$/, ""));
            }
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file || !docName) return;
        setIsUploading(true);
        
        try {
            const filePath = `artifacts/${appId}/users/${userId}/mebDocuments/${Date.now()}_${file.name}`;
            const storageRef = ref(storage, filePath);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);

            const mebCollectionPath = collection(db, 'artifacts', appId, 'users', userId, 'mebDocuments');
            await addDoc(mebCollectionPath, {
                documentName: docName,
                fileUrl: url,
                storagePath: filePath,
                uploadDate: Timestamp.now(),
            });

            setFile(null);
            setDocName('');
            if(fileInputRef.current) fileInputRef.current.value = "";

        } catch (error) {
            console.error("Error uploading MEB document:", error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md">
            <h3 className="font-semibold text-xl p-4 md:p-6 border-b border-gray-200 text-gray-800">MEB Documents</h3>
            <div className="p-4 md:p-6">
                <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="md:col-span-2">
                        <FormInput label="Document Name" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="e.g., Official Letter" required />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} required className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                    </div>
                    <div className="md:col-span-1">
                        <button type="submit" disabled={isUploading} className="w-full flex items-center justify-center px-4 py-2 rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400">
                            <Icon path={ICONS.UPLOAD} className="w-5 h-5 mr-2" />
                            {isUploading ? 'Uploading...' : 'Upload'}
                        </button>
                    </div>
                </form>
            </div>
            {mebDocs.length > 0 ? (
                <ul className="divide-y divide-gray-200 border-t border-gray-200">
                    {mebDocs.map(doc => (
                        <li key={doc.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                             <div>
                                <span className="text-gray-700 font-medium">{doc.documentName}</span>
                                <p className="text-xs text-gray-500">Uploaded: {doc.uploadDate.toDate().toLocaleDateString()}</p>
                            </div>
                            <div className="flex space-x-2">
                                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-200"><Icon path={ICONS.EYE} className="w-5 h-5" /></a>
                                <a href={doc.fileUrl} download className="p-2 text-gray-500 hover:text-green-600 rounded-full hover:bg-gray-200"><Icon path={ICONS.DOWNLOAD} className="w-5 h-5" /></a>
                                <button onClick={() => onDelete({ ...doc, name: doc.documentName, url: doc.storagePath })} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-200"><Icon path={ICONS.DELETE} className="w-5 h-5" /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="p-6 text-gray-500 border-t border-gray-200">No MEB documents uploaded yet.</p>
            )}
        </div>
    );
};


const SettingsModule = () => (
    <div className="p-4 md:p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6">Settings</h2>
        <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-gray-600">
                Future settings, such as data export and message templates, will be available here.
            </p>
        </div>
    </div>
);


// --- LAYOUT COMPONENTS ---
const Sidebar = ({ currentPage, setCurrentPage, isSidebarOpen }) => {
    const NavItem = ({ icon, label, pageName }) => ( <li onClick={() => setCurrentPage(pageName)} className={`flex items-center p-3 my-1 rounded-lg cursor-pointer transition-colors ${ currentPage === pageName ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-700/50 hover:text-white'}`}><Icon path={icon} /><span className="ml-4 font-medium">{label}</span></li> );
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

const Header = ({ toggleSidebar }) => {
    return (
        <header className="flex items-center justify-between md:justify-end h-16 px-6 bg-white border-b border-gray-200 flex-shrink-0">
            <button onClick={toggleSidebar} className="md:hidden text-gray-500">
                <Icon path={ICONS.MENU} />
            </button>
        </header>
    );
};

const MainContent = ({ currentPage }) => {
    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard': return <DashboardModule />;
            case 'students': return <StudentsModule />;
            case 'groups': return <GroupsModule />;
            case 'finances': return <FinancesModule />;
            case 'documents': return <DocumentsModule />;
            case 'settings': return <SettingsModule />;
            default: return <DashboardModule />;
        }
    };
    return <main className="flex-1 overflow-y-auto bg-gray-100">{renderPage()}</main>;
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
    const [transactions, setTransactions] = useState([]);

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
        
        const transactionsCollectionPath = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
        const unsubTransactions = onSnapshot(transactionsCollectionPath, (snapshot) => {
            const transactionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(transactionsData);
        });

        return () => {
            unsubGroups();
            unsubStudents();
            unsubTransactions();
        };
    }, [user, db, appId]);

    if (!authReady || !user) {
        return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-2xl font-semibold text-gray-700">Loading System...</div></div>;
    }

    return (
        <AppContext.Provider value={{ db, storage, auth, userId: user.uid, appId, groups, students, transactions }}>
            <div className="flex h-screen font-sans text-gray-900 bg-gray-100">
                <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} isSidebarOpen={isSidebarOpen}/>
                <div className="flex flex-col flex-1 min-w-0">
                    <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
                    <MainContent currentPage={currentPage} />
                </div>
            </div>
        </AppContext.Provider>
    );
}
