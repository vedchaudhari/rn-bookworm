import { View, Text, Platform, ScrollView, TextInput, TouchableOpacity, Alert, Image, ActivityIndicator, Keyboard } from 'react-native'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'expo-router';
import styles from '../../assets/styles/create.styles';
import COLORS from '../../constants/colors';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from "expo-image-picker";
import { useAuthStore } from '../../store/authContext';
import { API_URL } from '../../constants/api';
import SafeScreen from '../../components/SafeScreen';

export default function CreateTab() {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [rating, setRating] = useState(3);
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [genre, setGenre] = useState("General");
  const [author, setAuthor] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hide = Keyboard.addListener("keyboardDidHide", () => {
      setKeyboardHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const { token } = useAuthStore();

  const router = useRouter();

  const pickImage = async () => {
    try {
      //Ask permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Permission to access the media library is required.");
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
        base64: true
      })

      if (!result.canceled) {

        setImage(result.assets[0].uri);
        setImageBase64(result.assets[0].base64);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "There was a problem selecting your image");
    }
  }

  const handleSubmit = async () => {
    if (!title || !imageBase64 || !caption) {
      Alert.alert("Incomplete form", "All fields are required")
      return;
    }

    try {
      setLoading(true);

      //get file extension
      // const uriParts = image.split(".");
      // const fileType = uriParts[uriParts.length-1];
      // const imageType = fileType? `image/${fileType.toLowerCase()}` : "image/jpeg";

      const imageRes = await fetch(image);
      const imageBlob = await imageRes.blob();
      const imageType = imageBlob.type || "image/jpeg";

      const imageDataUrl = `data:${imageType};base64,${imageBase64}`;

      const res = await fetch(
        `${API_URL}/api/books`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            title,
            caption,
            rating: rating.toString(),
            image: imageDataUrl,
            genre,
            author,
          }),
        }
      )

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Something went wrong");
      }

      Alert.alert("Success", "Your book recommendation has been posted!")

      setTitle("");
      setCaption("");
      setRating(3);
      setImage(null);
      setImageBase64(null);
      setGenre("General");
      setAuthor("");
      router.push("/");

    } catch (error) {
      console.error("Error creating post: ", error);
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setLoading(false);
    }


  };

  const renderRatingPicker = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => setRating(i)} style={styles.starButton}>
          <Ionicons
            name={i <= rating ? "star" : "star-outline"}
            size={32}
            color={i <= rating ? COLORS.gold : COLORS.textSecondary}
          />
        </TouchableOpacity>
      )
    }

    return <View style={styles.ratingContainer}>{stars}</View>
  }

  return (
    <SafeScreen isTabScreen={true}>
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: keyboardHeight ? keyboardHeight + 20 : 40 }
          ]}
          style={styles.scrollViewStyle}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {/* HEADER */}
            <View style={styles.header}>
              <Text style={styles.title}>Add Book Recommendation</Text>
              <Text style={styles.subtitle}>Share your favorite reads with others</Text>
            </View>

            {/*Book title*/}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Book Title</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="book-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder='Enter book title'
                  placeholderTextColor={COLORS.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />
              </View>
            </View>

            {/*Author*/}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Author</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder='Enter author name'
                  placeholderTextColor={COLORS.textSecondary}
                  value={author}
                  onChangeText={setAuthor}
                />
              </View>
            </View>

            {/*Genre*/}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Genre</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="library-outline"
                  size={20}
                  color={COLORS.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder='Enter genre (e.g., Fiction, Mystery)'
                  placeholderTextColor={COLORS.textSecondary}
                  value={genre}
                  onChangeText={setGenre}
                />
              </View>
            </View>

            {/*Rating*/}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Rating</Text>
              {renderRatingPicker()}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Book Image</Text>

              <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>

                {
                  image
                    ? (<Image source={{ uri: image }} style={styles.previewImage} />)
                    : (
                      <View style={styles.placeholderContainer}>
                        <Ionicons name="image-outline" size={40} color={COLORS.textSecondary} />
                        <Text style={styles.placeholderText}>Tap to select image</Text>
                      </View>
                    )
                }

              </TouchableOpacity>
            </View>

            {/*Captions*/}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Caption</Text>
              <TextInput
                style={styles.textArea}
                value={caption}
                onChangeText={setCaption}
                placeholder='Enter captions'
                placeholderTextColor={COLORS.placeholderText}
                multiline
              />
            </View>

            {/*Upload button*/}
            <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
              {
                loading ?
                  (<ActivityIndicator color={COLORS.white} />)
                  : <>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={20}
                      color={COLORS.white}
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.buttonText}>Share</Text>
                  </>
              }
            </TouchableOpacity>

          </View>
        </ScrollView>
      </View>
    </SafeScreen>
  )
}