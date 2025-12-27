
import React, { createContext, useContext, useState, useEffect } from 'react';
import { render, Box, Text, useInput } from 'ink';

// --- 1. Animation Hook ---
// Animates a value from start -> end over time (integer steps)
const useAnimatedValue = (targetValue, startValue, speed = 80) => {
	const [value, setValue] = useState(startValue);
	const [isComplete, setIsComplete] = useState(false);

	useEffect(() => {
		if (value === targetValue) {
			setIsComplete(true);
			return;
		}
		setIsComplete(false);
		
		const timer = setTimeout(() => {
			setValue((prev) => {
				if (prev === targetValue) return prev;
				const direction = prev < targetValue ? 1 : -1;
				return prev + direction;
			});
		}, speed);

		return () => clearTimeout(timer);
	}, [value, targetValue, speed]);

	return { value, isComplete };
};

// --- 2. The Toast Item Component ---
const TOAST_HEIGHT = 3; // 1 row text + 2 rows border

const ToastItem = ({ id, message, type, isExiting, onRemove }) => {
	// If parent says "isExiting", target is 0. Otherwise target is TOAST_HEIGHT.
	const targetHeight = isExiting ? 0 : TOAST_HEIGHT;
	
	const { value: currentHeight, isComplete } = useAnimatedValue(targetHeight, 0, 60);

	// Auto-dismiss timer
	useEffect(() => {
		if (isExiting) return; // Don't set timer if already leaving

		const timer = setTimeout(() => {
			// Trigger exit animation (don't delete yet)
			onRemove(id, true); 
		}, 4000); 

		return () => clearTimeout(timer);
	}, [isExiting, id, onRemove]);

	// Cleanup after animation completes
	useEffect(() => {
		if (targetHeight === 0 && isComplete) {
			onRemove(id, false); // Force delete now
		}
	}, [targetHeight, isComplete, id, onRemove]);

	const color = type === 'error' ? 'red' : 'green';

	return (
		<Box 
			flexDirection="column" 
			height={currentHeight} 
			overflow="hidden" // Hides content while growing/shrinking
			width="100%"
		>
			<Box 
				borderStyle="round" 
				borderColor={color} 
				paddingX={1}
				height={TOAST_HEIGHT} 
				width="100%"
			>
				<Text color={color} bold>{type === 'error' ? 'ERR' : 'OK'}: </Text>
				<Text>{message}</Text>
			</Box>
		</Box>
	);
};

// --- 3. The Toast Provider ---
export const ToastContext = createContext({ showToast: (msg, type) => {} });

export const ToastProvider = ({ children, maxToasts = 5 }) => {
	const [toasts, setToasts] = useState([]);

	const showToast = (message, type = 'info') => {
		const id = Date.now() + Math.random();
		// New toasts start with isExiting: false
		setToasts((prev) => [...prev, { id, message, type, isExiting: false }]);
	};

	const handleRemoveRequest = (id, startAnimationOnly) => {
		setToasts((prev) => {
			if (startAnimationOnly) {
				// Mark as exiting so it shrinks gracefully
				return prev.map(t => t.id === id ? { ...t, isExiting: true } : t);
			} else {
				// Actually remove from array
				return prev.filter(t => t.id !== id);
			}
		});
	};

	// Limit visible toasts to maxToasts
	useEffect(() => {
		const activeToasts = toasts.filter(t => !t.isExiting);
		if (activeToasts.length > maxToasts) {
			// Find oldest active toast and trigger exit
			const oldestId = activeToasts[0].id;
			handleRemoveRequest(oldestId, true);
		}
	}, [toasts, maxToasts]);

	return (
		<ToastContext.Provider value={{ showToast }}>
			<Box flexDirection="column" width="100%" height="100%">
				{/* Layer 1: The App */}
				<Box flexGrow={1}>
					{children}
				</Box>

				{/* Layer 2: The Toasts (Absolute Overlay) */}
				<Box 
					position="absolute" 
					bottom={0} 
					right={0} 
					width={40} 
					flexDirection="column" 
					justifyContent="flex-end" // Stacks items at bottom
				>
					{toasts.map((t) => (
						<ToastItem 
							key={t.id}
							{...t}
							onRemove={handleRemoveRequest}
						/>
					))}
				</Box>
			</Box>
		</ToastContext.Provider>
	);
};

export const useToast = () => useContext(ToastContext);
