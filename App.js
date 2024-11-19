import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, TextInput, View,
  FlatList, TouchableOpacity, Modal, Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [task, setTask] = useState('');
  const [tasks, setTasks] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const saveTasksToStorage = async (tasks) => {
    try {
      await AsyncStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks to AsyncStorage:', error);
    }
  };

  const loadTasksFromStorage = async () => {
    try {
      const storedTasks = await AsyncStorage.getItem('tasks');
      if (storedTasks) {
        setTasks(JSON.parse(storedTasks));
      }
    } catch (error) {
      console.error('Error loading tasks from AsyncStorage:', error);
    }
  };

  useEffect(() => {
    loadTasksFromStorage(); // Load tasks on component mount
  }, []);

  useEffect(() => {
    saveTasksToStorage(tasks); // Save tasks whenever they change
  }, [tasks]);

  const addTask = () => {
    if (task.trim()) {
      const newTask = {
        id: Date.now().toString(),
        text: task,
        checked: false,
        hasAnimated: false,
      };
      setTasks([...tasks, newTask]);
      setTask('');
    }
  };

  const deleteTask = (taskId) => {
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== taskId));
  };

  const saveTaskEdit = (editedTask) => { // Only if the save button is hit in the modal
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === editedTask.id ? { ...task, text: editedTask.text } : task
      )
    );
    setModalVisible(false); // Close modal after saving
  };

  const checkOff = (taskId) => { // When the checkbox is hit
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, checked: !task.checked } : task // Toggle the 'checked' state
      )
    );
  };

  const animatedRefs = useRef(new Map());

  const markAsAnimated = (taskId) => {
    animatedRefs.current.set(taskId, true);
  };

  const openTaskModal = (task) => {
    setSelectedTask(task);
    setModalVisible(true);
  };

  const AnimatedTaskItem = ({ task, onCheckOff, onDelete, onOpen }) => {
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
      if (!animatedRefs.current.get(task.id)) { // If task is not already animated
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
        ]).start(() => {
          markAsAnimated(task.id); // Mark as animated after animation completes
        });
      } else { // If it has been animated previously
        opacity.setValue(1); 
        scale.setValue(1);
      }
    }, [task.id]); // Dependency to re-run for new tasks only

    const handleDelete = () => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.8, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        onDelete(task.id); // Trigger deletion after animation
      });
    };

    return (
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <View style={styles.taskContainer}>
          <TouchableOpacity
            style={[styles.checkbox, task.checked && styles.checked]}
            onPress={() => onCheckOff(task.id)}
          >
            {task.checked && <Text style={styles.checkmark}>✔</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onOpen(task)}>
            <Text style={[styles.taskText, task.checked && styles.taskTextChecked]}>
              {task.text}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}>
            <Text style={styles.deleteButton}>X</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Animated To-Do List</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add a new task"
          value={task}
          onChangeText={(text) => setTask(text)}
        />
        <TouchableOpacity style={styles.addButton} onPress={addTask}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={tasks}
        renderItem={({ item }) => (
          <AnimatedTaskItem
            task={item}
            onCheckOff={checkOff}
            onDelete={deleteTask}
            onOpen={openTaskModal}
            markAsAnimated={markAsAnimated} // Pass the function to track animation
          />
        )}
        keyExtractor={(item) => item.id}
      />
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            {selectedTask && (
              <>
                <Text style={styles.modalTitle}>Edit Task</Text>
                <TextInput
                  style={styles.modalInput}
                  value={selectedTask.text}
                  onChangeText={(text) =>
                    setSelectedTask((prev) => ({ ...prev, text }))
                  }
                />
                <View style={styles.modalButtonsContainer}>
                  <TouchableOpacity
                    style={styles.modalSaveButton}
                    onPress={() => saveTaskEdit(selectedTask)}
                  >
                    <Text style={styles.modalButtonText}>Save</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  addButton: {
    backgroundColor: '#5C5CFF',
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    marginLeft: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },

  // Task text and surroundings
  taskContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
  },
  taskText: {
    fontSize: 16,
    color: '#333',
  },
  taskTextChecked: {
    textDecorationLine: 'line-through',
    color: '#999',
  },

  // Delete button
  deleteButton: {
    color: '#FF5C5C',
    fontWeight: 'bold',
    fontSize: 18,
  },

  // Checkbox
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 3,
    marginRight: 10,
  },
  checked: {
    backgroundColor: '#007BFF',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Modal stuff
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalInput: {
    width: '100%',
    borderBottomColor: '#ddd',
    borderBottomWidth: 1,
    fontSize: 16,
    marginBottom: 20,
    padding: 5,
  },
  modalContent: {
    width: '80%',
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  modalButtonsContainer: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginTop: 20,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#5C5CFF',
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#FF5C5C',
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 5,
    alignItems: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});