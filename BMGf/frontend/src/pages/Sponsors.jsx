import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios'; // Re-enabled axios import
import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faEdit, 
  faTrash, 
  faArrowLeft, 
  faGem, 
  faEye, 
  faImage, 
  faUpload, 
  faTimes,
  faSpinner,
  faChartLine,
  faUsers,
  faUserFriends,
  faMedal,
  faUserShield,
  faExclamationTriangle,
  faSync,
  faInfoCircle,
  faCrown,
  faBullseye,
  faRocket,
  faShield,
  faSkull,
  faGamepad,
  faEnvelope,
  faPhone,
  faCheck
} from '@fortawesome/free-solid-svg-icons';
import Navbar from '../components/navbar';
import { ThemeContext } from '../context/ThemeContext';

// Dummy image URL (for local development/testing without S3 setup)
const DUMMY_IMAGE_URL = 'https://media.istockphoto.com/id/814423752/photo/eye-of-model-with-colorful-art-make-up-close-up.jpg?s=612x612&w=0&k=20&c=l15OdMWjgCKycMMShP8UK94ELVlEGvt7GmB_esHWPYE=';

const Sponsors = () => {
  const { isLight } = useContext(ThemeContext);
  const navigate = useNavigate();
  const { tournamentId } = useParams();
  const [tournament, setTournament] = useState(null); // Set to null for fetching
  const [sponsors, setSponsors] = useState([]); // Initialize as empty array
  const [loading, setLoading] = useState(true); // Set to true for initial loading
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [currentSponsor, setCurrentSponsor] = useState(null);
  const [selectedSponsorForView, setSelectedSponsorForView] = useState(null);
  const [refreshingSponsors, setRefreshingSponsors] = useState(false);

  // Create post modal state
  const [showCreatePostModal, setShowCreatePostModal] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [createPostLoading, setCreatePostLoading] = useState(false);
  const [createPostError, setCreatePostError] = useState('');
  const [createPostSuccess, setCreatePostSuccess] = useState(false);

  // Ref for file input
  const fileInputRef = useRef(null);

  // File states and form data
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [promoFiles, setPromoFiles] = useState([null, null, null, null]);
  const [additionalFiles, setAdditionalFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState({
    logo: null,
    banner: null,
    promo: [null, null, null, null],
    additional: []
  });

  const initialFormData = {
    name: '',
    website: '',
    sponsorship_level: 'platinum',
    sponsorship_amount: '',
    sponsorship_currency: 'USD',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    description: '',
    is_active: true,
    start_date: '',
    end_date: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  // Helper function to get sponsorship level color
  const getSponsorshipLevelColor = (level) => {
    switch (level) {
      case 'platinum': return 'bg-gradient-to-r from-blue-500 to-blue-700';
      case 'gold': return 'bg-gradient-to-r from-yellow-500 to-yellow-700';
      case 'silver': return 'bg-gradient-to-r from-gray-400 to-gray-600';
      case 'bronze': return 'bg-gradient-to-r from-orange-500 to-orange-700';
      default: return 'bg-gray-500';
    }
  };

  // Function to fetch sponsors
  const fetchSponsors = async () => {
    try {
      setRefreshingSponsors(true);
      setError(null);
      const token = localStorage.getItem('token'); // Assuming token is stored in localStorage
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}api/sponsors/tournament/${tournamentId}/sponsors`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSponsors(response.data);
    } catch (err) {
      console.error('Error fetching sponsors:', err);
      setError(err.response?.data?.message || 'Failed to fetch sponsors.');
    } finally {
      setRefreshingSponsors(false);
    }
  };

  // useEffect for initial data fetching
  useEffect(() => {
    const fetchTournamentAndSponsors = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token'); // Assuming token is stored in localStorage

        const [tournamentResponse, sponsorsResponse] = await Promise.all([
          axios.get(`${process.env.REACT_APP_BACKEND_URL}api/tournaments/${tournamentId}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${process.env.REACT_APP_BACKEND_URL}api/sponsors/tournament/${tournamentId}/sponsors`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        setTournament(tournamentResponse.data.data); // Assuming tournament data is nested under .data
        setSponsors(sponsorsResponse.data);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.message || 'Failed to load tournament or sponsor information.');
      } finally {
        setLoading(false);
      }
    };

    if (tournamentId) {
      fetchTournamentAndSponsors();
    }
  }, [tournamentId]);

  // Function to handle file selection
  const handleFileSelect = (e, type, index = null) => {
    const file = e.target.files[0];
    if (file) {
      const newPreviewUrls = { ...previewUrls };
      const newFormData = { ...formData };

      if (type === 'logo') {
        setLogoFile(file);
        newPreviewUrls.logo = URL.createObjectURL(file);
      } else if (type === 'banner') {
        setBannerFile(file);
        newPreviewUrls.banner = URL.createObjectURL(file);
      } else if (type === 'promo' && index !== null) {
        const newPromoFiles = [...promoFiles];
        newPromoFiles[index] = file;
        setPromoFiles(newPromoFiles);
        newPreviewUrls.promo[index] = URL.createObjectURL(file);
      } else if (type === 'additional') {
        const newAdditionalFiles = [...additionalFiles, file];
        setAdditionalFiles(newAdditionalFiles);
        newPreviewUrls.additional = [...newPreviewUrls.additional, URL.createObjectURL(file)];
      }
      setPreviewUrls(newPreviewUrls);
    }
  };

  // Function to remove selected file
  const removeFile = (type, index = null) => {
    const newPreviewUrls = { ...previewUrls };
    
    // Track removals for backend API call
    if (currentSponsor) {
      // Only track removals when editing (not when adding new)
      switch (type) {
        case 'logo':
          if (currentSponsor.logo_url) {
            // Mark for deletion in backend
            setFormData(prev => ({ ...prev, remove_logo: 'true' }));
          }
          break;
        case 'banner':
          if (currentSponsor.banner_image_url) {
            // Mark for deletion in backend
            setFormData(prev => ({ ...prev, remove_banner: 'true' }));
          }
          break;
        case 'promo':
          if (index !== null) {
            const promoFields = [
              'promotional_image1_url',
              'promotional_image2_url',
              'promotional_image3_url',
              'promotional_image4_url'
            ];
            const field = promoFields[index];
            if (currentSponsor[field]) {
              // Mark for deletion in backend
              setFormData(prev => ({ ...prev, [`remove_promo${index + 1}`]: 'true' }));
            }
          }
          break;
        case 'additional':
          if (index !== null) {
            // For existing sponsor with additional images
            if (currentSponsor.images && Array.isArray(currentSponsor.images) && 
                index < currentSponsor.images.length) {
              // Get the key of the image to remove
              const imageKey = currentSponsor.images[index];
              if (imageKey) {
                // Add to list of keys to remove
                const currentRemovals = formData.remove_additional_images ? 
                  JSON.parse(formData.remove_additional_images) : [];
                
                setFormData(prev => ({
                  ...prev,
                  remove_additional_images: JSON.stringify([...currentRemovals, imageKey])
                }));
              }
            }
          }
          break;
      }
    }

    if (type === 'logo') {
      setLogoFile(null);
      newPreviewUrls.logo = null;
    } else if (type === 'banner') {
      setBannerFile(null);
      newPreviewUrls.banner = null;
    } else if (type === 'promo' && index !== null) {
      const newPromoFiles = [...promoFiles];
      newPromoFiles[index] = null;
      setPromoFiles(newPromoFiles);
      newPreviewUrls.promo[index] = null;
    } else if (type === 'additional' && index !== null) {
      const newAdditionalFiles = [...additionalFiles];
      newAdditionalFiles.splice(index, 1);
      setAdditionalFiles(newAdditionalFiles);
      newPreviewUrls.additional.splice(index, 1);
    }
    setPreviewUrls(newPreviewUrls);
  };

  // Function to open edit modal and pre-fill form
  const openEditModal = (sponsor) => {
    // First, clean up any existing state to avoid conflicts
    resetForm();
    
    // Set the current sponsor for tracking changes
    setCurrentSponsor(sponsor);
    
    // Set form data from sponsor
    setFormData({
      name: sponsor.name || '',
      website: sponsor.website || '',
      sponsorship_level: sponsor.sponsorship_level || 'platinum',
      sponsorship_amount: sponsor.sponsorship_amount || '',
      sponsorship_currency: sponsor.sponsorship_currency || 'USD',
      contact_person: sponsor.contact_person || '',
      contact_email: sponsor.contact_email || '',
      contact_phone: sponsor.contact_phone || '',
      description: sponsor.description || '',
      is_active: sponsor.is_active !== undefined ? sponsor.is_active : true,
      start_date: sponsor.start_date || '',
      end_date: sponsor.end_date || '',
      // Initialize without any image removal flags
      remove_logo: 'false',
      remove_banner: 'false',
      remove_promo1: 'false',
      remove_promo2: 'false',
      remove_promo3: 'false',
      remove_promo4: 'false',
      remove_additional_images: JSON.stringify([])
    });
    
    // Clear existing file inputs/previews when opening edit modal
    setLogoFile(null);
    setBannerFile(null);
    setPromoFiles([null, null, null, null]);
    setAdditionalFiles([]);
    
    // Set preview URLs from the sponsor data
    // The backend returns both the original keys in the base fields
    // and pre-signed URLs in the _url fields
    setPreviewUrls({
      logo: sponsor.logo_url_url || sponsor.logo_url || null,
      banner: sponsor.banner_image_url_url || sponsor.banner_image_url || null,
      promo: [
        sponsor.promotional_image1_url_url || sponsor.promotional_image1_url || null,
        sponsor.promotional_image2_url_url || sponsor.promotional_image2_url || null,
        sponsor.promotional_image3_url_url || sponsor.promotional_image3_url || null,
        sponsor.promotional_image4_url_url || sponsor.promotional_image4_url || null,
      ],
      additional: sponsor.image_urls || sponsor.images || [],
    });
    
    setShowEditModal(true);
  };

  const openViewModal = async (sponsor) => {
    try {
      
      // Fetch fresh data for the sponsor to ensure we have the latest URLs
      const token = localStorage.getItem('token');
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}api/sponsors/sponsors/${sponsor.sponsor_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      
      
      // Use the fresh data
      setSelectedSponsorForView(response.data);
      setShowViewModal(true);
    } catch (err) {
      console.error('Error fetching sponsor details:', err);
      // Fall back to using the existing data if fetch fails
      setSelectedSponsorForView(sponsor);
      setShowViewModal(true);
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setLogoFile(null);
    setBannerFile(null);
    setPromoFiles([null, null, null, null]);
    setAdditionalFiles([]);
    setPreviewUrls({
      logo: null,
      banner: null,
      promo: [null, null, null, null],
      additional: []
    });
    
    // Clear any image removal tracking
    setCurrentSponsor(null);
  };

  const handleAddSponsor = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      for (const key in formData) {
        formDataToSend.append(key, formData[key]);
      }

      // Track image types to send to backend
      const imageTypes = [];

      // Add logo file if exists
      if (logoFile) {
        formDataToSend.append('sponsor_images', logoFile);
        imageTypes.push('logo');
      }
      
      // Add banner file if exists
      if (bannerFile) {
        formDataToSend.append('sponsor_images', bannerFile);
        imageTypes.push('banner');
      }
      
      // Add promotional files if they exist
      promoFiles.forEach((file, index) => {
        if (file) {
          formDataToSend.append('sponsor_images', file);
          imageTypes.push(`promo${index + 1}`);
        }
      });
      
      // Add additional files if they exist
      additionalFiles.forEach(file => {
        if (file) {
          formDataToSend.append('sponsor_images', file);
          imageTypes.push('additional');
        }
      });

      // Add image types to form data if we have any
      if (imageTypes.length > 0) {
        formDataToSend.append('image_types', JSON.stringify(imageTypes));
      }

      const response = await axios.post(`${process.env.REACT_APP_BACKEND_URL}api/sponsors/tournament/${tournamentId}/sponsors`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
      });
      
      setShowAddModal(false);
      resetForm();
      fetchSponsors(); // Refresh list after adding
    } catch (err) {
      console.error('Error adding sponsor:', err);
      setError(err.response?.data?.message || 'Failed to add sponsor.');
    }
  };

  const handleEditSponsor = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      for (const key in formData) {
        formDataToSend.append(key, formData[key]);
      }

      // Track image types to send to backend
      const imageTypes = [];
      
      // Add logo file if exists
      if (logoFile) {
        formDataToSend.append('sponsor_images', logoFile);
        imageTypes.push('logo');
      }
      
      // Add banner file if exists
      if (bannerFile) {
        formDataToSend.append('sponsor_images', bannerFile);
        imageTypes.push('banner');
      }
      
      // Add promotional files if they exist
      promoFiles.forEach((file, index) => {
        if (file) {
          formDataToSend.append('sponsor_images', file);
          imageTypes.push(`promo${index + 1}`);
        }
      });
      
      // Add additional files if they exist
      additionalFiles.forEach(file => {
        if (file) {
          formDataToSend.append('sponsor_images', file);
          imageTypes.push('additional');
        }
      });

      // Add image types to form data if we have any
      if (imageTypes.length > 0) {
        formDataToSend.append('image_types', JSON.stringify(imageTypes));
      }

      const response = await axios.put(`${process.env.REACT_APP_BACKEND_URL}api/sponsors/tournament/${tournamentId}/sponsors/${currentSponsor.sponsor_id}`, formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        },
      });
      
      setShowEditModal(false);
      resetForm();
      fetchSponsors(); // Refresh list after updating
    } catch (err) {
      console.error('Error updating sponsor:', err);
      setError(err.response?.data?.message || 'Failed to update sponsor.');
    }
  };

  const handleDeleteSponsor = async (id) => {
    if (window.confirm('Are you sure you want to delete this sponsor?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`${process.env.REACT_APP_BACKEND_URL}api/sponsors/tournament/${tournamentId}/sponsors/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        fetchSponsors(); // Refresh list after deleting
      } catch (err) {
        console.error('Error deleting sponsor:', err);
        setError(err.response?.data?.message || 'Failed to delete sponsor.');
      }
    }
  };

  // Handle Create Post button click
  const openCreatePostModal = () => {
    setShowCreatePostModal(true);
    setPostTitle('');
    setPostContent('');
    setSelectedImages([]);
    setImagePreviewUrls([]);
    setCreatePostError('');
    setCreatePostSuccess(false);
  };

  // Handle closing the create post modal
  const closeCreatePostModal = () => {
    if (!createPostLoading) {
      setShowCreatePostModal(false);

      // Reset form state if needed
      setTimeout(() => {
        setCreatePostSuccess(false);
        setCreatePostError('');
      }, 300);
    }
  };

  // Handle image file selection for new post
  const handleImageSelect = (e) => {
    e.preventDefault();
    const files = Array.from(e.target.files);

    // Limit to 5 images
    if (selectedImages.length + files.length > 5) {
      alert('You can only upload up to 5 images');
      return;
    }

    // Preview images and add them to state
    const newImageFiles = [...selectedImages];
    const newImagePreviews = [...imagePreviewUrls];

    files.forEach((file) => {
      // Only accept image files
      if (!file.type.match('image.*')) {
        return;
      }

      newImageFiles.push(file);

      // Create URL for preview
      const reader = new FileReader();
      reader.onloadend = () => {
        newImagePreviews.push(reader.result);
        setImagePreviewUrls([...newImagePreviews]);
      };
      reader.readAsDataURL(file);
    });

    setSelectedImages(newImageFiles);
  };

  // Remove an image from the selection for new post
  const removeImage = (index) => {
    const newSelectedImages = [...selectedImages];
    const newImagePreviewUrls = [...imagePreviewUrls];

    newSelectedImages.splice(index, 1);
    newImagePreviewUrls.splice(index, 1);

    setSelectedImages(newSelectedImages);
    setImagePreviewUrls(newImagePreviewUrls);
  };

  // Submit the post creation
  const handleCreatePost = async (e) => {
    e.preventDefault();

    if (!postTitle.trim()) {
      setCreatePostError('Please enter a title for your post');
      return;
    }

    if (!postContent.trim()) {
      setCreatePostError('Please enter content for your post');
      return;
    }

    setCreatePostLoading(true);
    setCreatePostError('');

    try {
      const token = localStorage.getItem('token');

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('Title', postTitle);
      formData.append('Content', postContent);
      formData.append('Tournament_Id', tournamentId);
      formData.append('Is_Sponsored_Post', true);
      
      // Append each selected image with the correct field name 'images'
      selectedImages.forEach((image) => {
        formData.append('images', image);
      });

      // Send the post data to the API
      const response = await axios.post(
        `${process.env.REACT_APP_BACKEND_URL}api/tournament-posts/create`,
        formData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          } 
        }
      );

      if (response.data && response.data.status === 'success') {
        setCreatePostSuccess(true);
        // Close the modal after a delay
        setTimeout(() => {
          closeCreatePostModal();
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setCreatePostError(
        error.response?.data?.message || 'Failed to create post'
      );
    } finally {
      setCreatePostLoading(false);
    }
  };

  // Re-introduce loading and error conditional rendering
  if (loading) {
    return (
      <div className={`min-h-screen ${isLight 
        ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden`}>
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute top-20 left-10 w-32 h-32 bg-gradient-to-r ${isLight 
            ? 'from-purple-300/20 to-pink-300/20' 
            : 'from-purple-500/10 to-pink-500/10'} rounded-full blur-xl animate-pulse`}></div>
          <div className={`absolute top-40 right-20 w-48 h-48 bg-gradient-to-r ${isLight 
            ? 'from-blue-300/20 to-cyan-300/20' 
            : 'from-blue-500/10 to-cyan-500/10'} rounded-full blur-xl animate-pulse delay-1000`}></div>
          <div className={`absolute bottom-20 left-1/3 w-40 h-40 bg-gradient-to-r ${isLight 
            ? 'from-orange-300/20 to-red-300/20' 
            : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse delay-2000`}></div>
        </div>

        <Navbar />
        <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center relative z-10">
          <div className="relative">
            <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight 
              ? 'border-purple-600' 
              : 'border-purple-500'}`}></div>
            <div className={`animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 ${isLight 
              ? 'border-pink-600' 
              : 'border-pink-500'} absolute top-0 left-0 animate-reverse`}></div>
          </div>
          <p className={`mt-6 ${isLight ? 'text-gray-600' : 'text-gray-400'} animate-pulse text-lg`}>Loading sponsor information...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
     
    return (
      <div className={`min-h-screen ${isLight 
        ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
        : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'}`}>
        <Navbar />
        <div className="container mx-auto px-4 py-12 flex flex-col items-center">
          <div className={`text-${isLight ? 'red-600' : 'red-400'} text-xl mb-6 bg-red-500/${isLight ? '5' : '10'} p-6 rounded-xl border border-red-500/${isLight ? '20' : '30'}`}>
            {error || "Failed to load sponsor information"}
          </div>
          <button
            onClick={() => navigate(`/tournaments/${tournamentId}`)}
            className={`flex items-center gap-3 ${isLight 
              ? 'text-purple-600 hover:text-purple-700 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500' 
              : 'text-purple-400 hover:text-purple-300 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-400'} transition-all duration-300 px-6 py-3 rounded-xl backdrop-blur-sm ${isLight ? 'bg-white/20' : 'bg-black/20'}`}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
            <span className="font-semibold">Back to Tournament</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isLight 
      ? 'bg-gradient-to-br from-gray-100 via-white to-gray-200 text-gray-800' 
      : 'bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white'} relative overflow-hidden`}>
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-20 left-10 w-32 h-32 bg-gradient-to-r ${isLight 
          ? 'from-purple-300/20 to-pink-300/20' 
          : 'from-purple-500/10 to-pink-500/10'} rounded-full blur-xl animate-pulse`}></div>
        <div className={`absolute top-40 right-20 w-48 h-48 bg-gradient-to-r ${isLight 
          ? 'from-blue-300/20 to-cyan-300/20' 
          : 'from-blue-500/10 to-cyan-500/10'} rounded-full blur-xl animate-pulse delay-1000`}></div>
        <div className={`absolute bottom-20 left-1/3 w-40 h-40 bg-gradient-to-r ${isLight 
          ? 'from-orange-300/20 to-red-300/20' 
          : 'from-orange-500/10 to-red-500/10'} rounded-full blur-xl animate-pulse delay-2000`}></div>
      </div>

      <Navbar />

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Back button */}
        <button
          onClick={() => navigate(`/tournaments/${tournamentId}`)}
          className={`flex items-center gap-3 ${isLight 
            ? 'text-purple-600 hover:text-purple-700 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-500' 
            : 'text-purple-400 hover:text-purple-300 border-2 border-purple-500/30 hover:bg-purple-500/10 hover:border-purple-400'} transition-all duration-300 px-6 py-3 rounded-xl mb-8 backdrop-blur-sm ${isLight ? 'bg-white/20' : 'bg-black/20'}`}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span className="font-semibold">Back to Tournament</span>
        </button>

        {/* Tournament Header */}
        <div className={`${isLight 
          ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
          : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-8 shadow-2xl mb-8`}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className={`text-4xl md:text-5xl font-bold bg-gradient-to-r ${isLight 
                ? 'from-purple-600 via-pink-600 to-red-600' 
                : 'from-purple-400 via-pink-400 to-red-400'} bg-clip-text text-transparent mb-4`}>
                Tournament Sponsors
              </h1>
              <div className="flex flex-wrap items-center gap-4">
                <div className={`flex items-center gap-2 bg-gradient-to-r ${isLight 
                  ? 'from-blue-600/10 to-cyan-600/10 border border-blue-500/20 text-blue-700' 
                  : 'from-blue-600/20 to-cyan-600/20 border border-blue-500/30 text-blue-300'} px-4 py-2 rounded-full`}>
                  <FontAwesomeIcon icon={faChartLine} className={isLight ? 'text-blue-600' : 'text-blue-400'} />
                  <span className="font-semibold">💰 Sponsor Management</span>
                </div>
                <div className={`flex items-center gap-2 ${isLight 
                  ? 'bg-white/40 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-300/50' 
                  : 'bg-black/40 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-700/50'}`}>
                  <FontAwesomeIcon icon={faGamepad} className={isLight ? 'text-red-600' : 'text-red-400'} />
                  <span className={`font-semibold ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                    {tournament.tournament_Name}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setShowAddModal(true)}
                className={`bg-gradient-to-r ${isLight 
                  ? 'from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400' 
                  : 'from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'} text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 transition-all duration-300 shadow-lg hover:shadow-green-500/25 transform hover:scale-105`}
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Add Sponsor</span>
              </button>
              <button
                onClick={openCreatePostModal}
                className={`bg-gradient-to-r ${isLight 
                  ? 'from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400' 
                  : 'from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500'} text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 transition-all duration-300 shadow-lg hover:shadow-blue-500/25 transform hover:scale-105`}
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>Create Sponsor Post</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sponsors List */}
        <div className={`${isLight 
          ? 'bg-white/60 backdrop-blur-xl border border-gray-300/50' 
          : 'bg-black/60 backdrop-blur-xl border border-gray-700/50'} rounded-2xl p-6 shadow-2xl`}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={`text-xl font-bold bg-gradient-to-r ${isLight 
              ? 'from-cyan-600 to-blue-600' 
              : 'from-cyan-400 to-blue-400'} bg-clip-text text-transparent flex items-center gap-3`}>
              <FontAwesomeIcon icon={faGem} className={isLight ? 'text-cyan-600' : 'text-cyan-400'} />
              Active Sponsors
            </h2>
            <button
              onClick={() => fetchSponsors()}
              disabled={refreshingSponsors}
              className={`${isLight 
                ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-500/10' 
                : 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10'} transition-colors p-2 rounded-lg`}
              title="Refresh sponsors"
            >
              <FontAwesomeIcon
                icon={refreshingSponsors ? faSpinner : faSync}
                className={refreshingSponsors ? "animate-spin" : ""}
              />
            </button>
          </div>

          {sponsors.length === 0 ? (
            <div className={`text-center py-12 ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
              <FontAwesomeIcon icon={faGem} className={`text-4xl mb-4 ${isLight ? 'text-gray-500' : 'text-gray-600'}`} />
              <p className="text-lg mb-2">No sponsors found</p>
              <p className="text-sm">Add your first sponsor to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sponsors.map((sponsor) => (
                <div
                  key={sponsor.sponsor_id}
                  className={`${isLight 
                    ? 'bg-white/40 backdrop-blur-sm border border-gray-300/50' 
                    : 'bg-black/40 backdrop-blur-sm border border-gray-700/50'} rounded-xl p-6 transition-all duration-300 hover:scale-105 hover:shadow-xl`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {console.log(`Sponsor ${sponsor.name} logo URLs:`, {
                        logo_url: sponsor.logo_url, 
                        logo_url_url: sponsor.logo_url_url
                      })}
                      {(sponsor.logo_url_url || sponsor.logo_url) ? (
                        <img
                          src={sponsor.logo_url_url || sponsor.logo_url}
                          alt={sponsor.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-purple-500/30"
                          onError={(e) => {
                            console.error(`Error loading logo for ${sponsor.name}`);
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/150/CCCCCC/808080?text=No+Logo';
                          }}
                        />
                      ) : (
                        <div className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-purple-500/30 bg-gray-700">
                          <FontAwesomeIcon icon={faImage} className="text-xl text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h3 className={`font-bold text-lg ${isLight ? 'text-gray-900' : 'text-white'}`}>
                          {sponsor.name}
                        </h3>
                        <p className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                          {sponsor.sponsorship_level}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          openViewModal(sponsor);
                        }}
                        className={`${isLight 
                          ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-500/10' 
                          : 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/10'} p-2 rounded-lg transition-colors`}
                        title="View details"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button
                        onClick={() => openEditModal(sponsor)}
                        className={`${isLight 
                          ? 'text-yellow-600 hover:text-yellow-700 hover:bg-yellow-500/10' 
                          : 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'} p-2 rounded-lg transition-colors`}
                        title="Edit sponsor"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        onClick={() => handleDeleteSponsor(sponsor.sponsor_id)}
                        className={`${isLight 
                          ? 'text-red-600 hover:text-red-700 hover:bg-red-500/10' 
                          : 'text-red-400 hover:text-red-300 hover:bg-red-500/10'} p-2 rounded-lg transition-colors`}
                        title="Delete sponsor"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                  <div className={`text-sm ${isLight ? 'text-gray-600' : 'text-gray-400'} mb-4`}>
                    {sponsor.description}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className={`text-sm font-semibold ${isLight ? 'text-purple-600' : 'text-purple-400'}`}>
                      {sponsor.sponsorship_amount} {sponsor.sponsorship_currency}
                    </div>
                    <div className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-500'}`}>
                      {new Date(sponsor.start_date).toLocaleDateString()} - {new Date(sponsor.end_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit/View Modals with enhanced styling */}
      {showAddModal && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${showAddModal ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className={`${isLight 
              ? 'bg-white/90 border border-gray-200' 
              : 'bg-gray-900/90 border border-gray-700'} rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative z-10 transform scale-100`}
          >
            <h3 className={`text-3xl font-bold bg-gradient-to-r ${isLight 
              ? 'from-green-600 to-emerald-600' 
              : 'from-green-400 to-emerald-400'} bg-clip-text text-transparent mb-6`}>
              <FontAwesomeIcon icon={faPlus} className="mr-3" />Add New Sponsor
            </h3>
            <form onSubmit={handleAddSponsor}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="name" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Name</label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="website" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Website</label>
                  <input
                    type="url"
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  />
                </div>
                <div>
                  <label htmlFor="sponsorship_level" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Sponsorship Level</label>
                  <select
                    id="sponsorship_level"
                    value={formData.sponsorship_level}
                    onChange={(e) => setFormData({ ...formData, sponsorship_level: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  >
                    <option value="platinum">Platinum</option>
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                    <option value="bronze">Bronze</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="sponsorship_amount" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Amount</label>
                  <input
                    type="number"
                    id="sponsorship_amount"
                    value={formData.sponsorship_amount}
                    onChange={(e) => setFormData({ ...formData, sponsorship_amount: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  />
                </div>
                <div>
                  <label htmlFor="sponsorship_currency" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Currency</label>
                  <select
                    id="sponsorship_currency"
                    value={formData.sponsorship_currency}
                    onChange={(e) => setFormData({ ...formData, sponsorship_currency: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  >
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="contact_person" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Contact Person</label>
                  <input
                    type="text"
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  />
                </div>
                <div>
                  <label htmlFor="contact_email" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Contact Email</label>
                  <input
                    type="email"
                    id="contact_email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  />
                </div>
                <div>
                  <label htmlFor="contact_phone" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Contact Phone</label>
                  <input
                    type="tel"
                    id="contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="description" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Description</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                    rows="3"
                  />
                </div>
                <div>
                  <label htmlFor="start_date" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Start Date</label>
                  <input
                    type="date"
                    id="start_date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  />
                </div>
                <div>
                  <label htmlFor="end_date" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>End Date</label>
                  <input
                    type="date"
                    id="end_date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  />
                </div>
              </div>

              {/* File Uploads */}
              <div className={`${isLight ? 'bg-gray-50' : 'bg-gray-800'} p-6 rounded-xl mb-6 shadow-inner`}>
                <h4 className={`text-xl font-bold mb-4 ${isLight ? 'text-gray-800' : 'text-white'}`}>Sponsor Visuals</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Upload */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Logo</label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer 
                        ${isLight ? 'bg-purple-100 hover:bg-purple-200 text-purple-700' : 'bg-purple-700/30 hover:bg-purple-700/50 text-purple-300'} 
                        transition-colors duration-200 border-2 ${isLight ? 'border-purple-300' : 'border-purple-600'}`}>
                        <FontAwesomeIcon icon={faUpload} className="text-2xl mb-2" />
                        <span className="text-sm font-semibold">Upload Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileSelect(e, 'logo')}
                          className="hidden"
                        />
                      </label>
                      {previewUrls.logo && (
                        <div className="relative">
                          <img
                            src={previewUrls.logo}
                            alt="Logo preview"
                            className="h-20 w-20 object-cover rounded-full border-2 border-purple-500 shadow-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile('logo')}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs w-6 h-6 flex items-center justify-center transition-transform transform hover:scale-110"
                            title="Remove logo"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Banner Image Upload */}
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Banner Image</label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer 
                        ${isLight ? 'bg-blue-100 hover:bg-blue-200 text-blue-700' : 'bg-blue-700/30 hover:bg-blue-700/50 text-blue-300'} 
                        transition-colors duration-200 border-2 ${isLight ? 'border-blue-300' : 'border-blue-600'}`}>
                        <FontAwesomeIcon icon={faImage} className="text-2xl mb-2" />
                        <span className="text-sm font-semibold">Upload Banner</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileSelect(e, 'banner')}
                          className="hidden"
                        />
                      </label>
                      {previewUrls.banner && (
                        <div className="relative w-48 h-24">
                          <img
                            src={previewUrls.banner}
                            alt="Banner preview"
                            className="w-full h-full object-cover rounded-xl shadow-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile('banner')}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 text-xs w-6 h-6 flex items-center justify-center transition-transform transform hover:scale-110"
                            title="Remove banner"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Promotional Images Upload */}
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Promotional Images (Max 4)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="relative flex flex-col items-center">
                          <label className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer h-24 w-full 
                            ${isLight ? 'bg-cyan-100 hover:bg-cyan-200 text-cyan-700' : 'bg-cyan-700/30 hover:bg-cyan-700/50 text-cyan-300'} 
                            transition-colors duration-200 border-2 ${isLight ? 'border-cyan-300' : 'border-cyan-600'}`}>
                            <FontAwesomeIcon icon={faUpload} className="text-xl mb-1" />
                            <span className="text-xs font-semibold">Promo {index + 1}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileSelect(e, 'promo', index)}
                              className="hidden"
                            />
                          </label>
                          {previewUrls.promo[index] && (
                            <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                              <img
                                src={previewUrls.promo[index]}
                                alt={`Promo ${index + 1} preview`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeFile('promo', index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs w-5 h-5 flex items-center justify-center transition-transform transform hover:scale-110"
                                title="Remove promo image"
                              >
                                <FontAwesomeIcon icon={faTimes} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Additional Images Upload */}
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Additional Images</label>
                    <div className="mt-2 flex flex-wrap gap-4">
                      <label className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer 
                        ${isLight ? 'bg-green-100 hover:bg-green-200 text-green-700' : 'bg-green-700/30 hover:bg-green-700/50 text-green-300'} 
                        transition-colors duration-200 border-2 ${isLight ? 'border-green-300' : 'border-green-600'}`}>
                        <FontAwesomeIcon icon={faUpload} className="text-2xl mb-2" />
                        <span className="text-sm font-semibold">Add More Images</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileSelect(e, 'additional')}
                          className="hidden"
                          multiple
                        />
                      </label>
                      {previewUrls.additional.map((url, index) => (
                        <div key={index} className="relative w-24 h-24">
                          <img
                            src={url}
                            alt={`Additional ${index + 1}`}
                            className="w-full h-full object-cover rounded-xl shadow-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile('additional', index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs w-5 h-5 flex items-center justify-center transition-transform transform hover:scale-110"
                            title="Remove image"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 
                    ${isLight 
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`bg-gradient-to-r ${isLight 
                    ? 'from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400' 
                    : 'from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'} text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-green-500/25 transform hover:scale-105`}
                >
                  <FontAwesomeIcon icon={faPlus} />
                  Add Sponsor
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showEditModal && currentSponsor && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${showEditModal ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className={`${isLight 
              ? 'bg-white/90 border border-gray-200' 
              : 'bg-gray-900/90 border border-gray-700'} rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative z-10 transform scale-100`}
          >
            <h3 className={`text-3xl font-bold bg-gradient-to-r ${isLight 
              ? 'from-yellow-600 to-orange-600' 
              : 'from-yellow-400 to-orange-400'} bg-clip-text text-transparent mb-6`}>
              <FontAwesomeIcon icon={faEdit} className="mr-3" />Edit Sponsor
            </h3>
            <form onSubmit={handleEditSponsor}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label htmlFor="edit-name" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Name</label>
                  <input
                    type="text"
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="edit-website" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Website</label>
                  <input
                    type="url"
                    id="edit-website"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  />
                </div>
                <div>
                  <label htmlFor="edit-sponsorship_level" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Sponsorship Level</label>
                  <select
                    id="edit-sponsorship_level"
                    value={formData.sponsorship_level}
                    onChange={(e) => setFormData({ ...formData, sponsorship_level: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  >
                    <option value="platinum">Platinum</option>
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                    <option value="bronze">Bronze</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-sponsorship_amount" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Amount</label>
                  <input
                    type="number"
                    id="edit-sponsorship_amount"
                    value={formData.sponsorship_amount}
                    onChange={(e) => setFormData({ ...formData, sponsorship_amount: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  />
                </div>
                <div>
                  <label htmlFor="edit-sponsorship_currency" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Currency</label>
                  <select
                    id="edit-sponsorship_currency"
                    value={formData.sponsorship_currency}
                    onChange={(e) => setFormData({ ...formData, sponsorship_currency: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  >
                    <option value="USD">USD</option>
                    <option value="INR">INR</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-contact_person" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Contact Person</label>
                  <input
                    type="text"
                    id="edit-contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  />
                </div>
                <div>
                  <label htmlFor="edit-contact_email" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Contact Email</label>
                  <input
                    type="email"
                    id="edit-contact_email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  />
                </div>
                <div>
                  <label htmlFor="edit-contact_phone" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Contact Phone</label>
                  <input
                    type="tel"
                    id="edit-contact_phone"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="edit-description" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Description</label>
                  <textarea
                    id="edit-description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                    rows="3"
                  />
                </div>
                <div>
                  <label htmlFor="edit-start_date" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Start Date</label>
                  <input
                    type="date"
                    id="edit-start_date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  />
                </div>
                <div>
                  <label htmlFor="edit-end_date" className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>End Date</label>
                  <input
                    type="date"
                    id="edit-end_date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className={`w-full p-3 rounded-lg ${isLight 
                      ? 'bg-gray-100 border border-gray-300 text-gray-900 focus:border-purple-500 focus:ring-purple-500' 
                      : 'bg-gray-700 border border-gray-600 text-white focus:border-purple-400 focus:ring-purple-400'} transition-all duration-200`}
                  />
                </div>
              </div>

              {/* File Uploads for Edit Modal */}
              <div className={`${isLight ? 'bg-gray-50' : 'bg-gray-800'} p-6 rounded-xl mb-6 shadow-inner`}>
                <h4 className={`text-xl font-bold mb-4 ${isLight ? 'text-gray-800' : 'text-white'}`}>Sponsor Visuals</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Upload */}
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Logo</label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer 
                        ${isLight ? 'bg-purple-100 hover:bg-purple-200 text-purple-700' : 'bg-purple-700/30 hover:bg-purple-700/50 text-purple-300'} 
                        transition-colors duration-200 border-2 ${isLight ? 'border-purple-300' : 'border-purple-600'}`}>
                        <FontAwesomeIcon icon={faUpload} className="text-2xl mb-2" />
                        <span className="text-sm font-semibold">Upload Logo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileSelect(e, 'logo')}
                          className="hidden"
                        />
                      </label>
                      {previewUrls.logo && (
                        <div className="relative">
                          <img
                            src={previewUrls.logo}
                            alt="Logo preview"
                            className="h-20 w-20 object-cover rounded-full border-2 border-purple-500 shadow-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile('logo')}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 text-xs w-6 h-6 flex items-center justify-center transition-transform transform hover:scale-110"
                            title="Remove logo"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Banner Image Upload */}
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Banner Image</label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer 
                        ${isLight ? 'bg-blue-100 hover:bg-blue-200 text-blue-700' : 'bg-blue-700/30 hover:bg-blue-700/50 text-blue-300'} 
                        transition-colors duration-200 border-2 ${isLight ? 'border-blue-300' : 'border-blue-600'}`}>
                        <FontAwesomeIcon icon={faImage} className="text-2xl mb-2" />
                        <span className="text-sm font-semibold">Upload Banner</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileSelect(e, 'banner')}
                          className="hidden"
                        />
                      </label>
                      {previewUrls.banner && (
                        <div className="relative w-48 h-24">
                          <img
                            src={previewUrls.banner}
                            alt="Banner preview"
                            className="w-full h-full object-cover rounded-xl shadow-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile('banner')}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 text-xs w-6 h-6 flex items-center justify-center transition-transform transform hover:scale-110"
                            title="Remove banner"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Promotional Images Upload */}
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Promotional Images (Max 4)</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="relative flex flex-col items-center">
                          <label className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer h-24 w-full 
                            ${isLight ? 'bg-cyan-100 hover:bg-cyan-200 text-cyan-700' : 'bg-cyan-700/30 hover:bg-cyan-700/50 text-cyan-300'} 
                            transition-colors duration-200 border-2 ${isLight ? 'border-cyan-300' : 'border-cyan-600'}`}>
                            <FontAwesomeIcon icon={faUpload} className="text-xl mb-1" />
                            <span className="text-xs font-semibold">Promo {index + 1}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileSelect(e, 'promo', index)}
                              className="hidden"
                            />
                          </label>
                          {previewUrls.promo[index] && (
                            <div className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center">
                              <img
                                src={previewUrls.promo[index]}
                                alt={`Promo ${index + 1} preview`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeFile('promo', index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs w-5 h-5 flex items-center justify-center transition-transform transform hover:scale-110"
                                title="Remove promo image"
                              >
                                <FontAwesomeIcon icon={faTimes} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Additional Images Upload */}
                  <div className="md:col-span-2">
                    <label className={`block text-sm font-medium mb-1 ${isLight ? 'text-gray-700' : 'text-gray-300'}`}>Additional Images</label>
                    <div className="mt-2 flex flex-wrap gap-4">
                      <label className={`flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer 
                        ${isLight ? 'bg-green-100 hover:bg-green-200 text-green-700' : 'bg-green-700/30 hover:bg-green-700/50 text-green-300'} 
                        transition-colors duration-200 border-2 ${isLight ? 'border-green-300' : 'border-green-600'}`}>
                        <FontAwesomeIcon icon={faUpload} className="text-2xl mb-2" />
                        <span className="text-sm font-semibold">Add More Images</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileSelect(e, 'additional')}
                          className="hidden"
                          multiple
                        />
                      </label>
                      {previewUrls.additional.map((url, index) => (
                        <div key={index} className="relative w-24 h-24">
                          <img
                            src={url}
                            alt={`Additional ${index + 1}`}
                            className="w-full h-full object-cover rounded-xl shadow-md"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile('additional', index)}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs w-5 h-5 flex items-center justify-center transition-transform transform hover:scale-110"
                            title="Remove image"
                          >
                            <FontAwesomeIcon icon={faTimes} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); resetForm(); }}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 
                    ${isLight 
                      ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                      : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`bg-gradient-to-r ${isLight 
                    ? 'from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400' 
                    : 'from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500'} text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-yellow-500/25 transform hover:scale-105`}
                >
                  <FontAwesomeIcon icon={faEdit} />
                  Update Sponsor
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showViewModal && selectedSponsorForView && (
        <div className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-300 ${showViewModal ? 'opacity-100' : 'opacity-0'}`}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowViewModal(false)}></div>
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className={`${isLight 
              ? 'bg-white/90 border border-gray-200' 
              : 'bg-gray-900/90 border border-gray-700'} rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative z-10 transform scale-100`}
          >
            <h3 className={`text-3xl font-bold bg-gradient-to-r ${isLight 
              ? 'from-blue-600 to-cyan-600' 
              : 'from-blue-400 to-cyan-400'} bg-clip-text text-transparent mb-6 flex items-center gap-4`}>
              <FontAwesomeIcon icon={faEye} className="mr-2" />
              {(selectedSponsorForView.logo_url_url || selectedSponsorForView.logo_url) && (
                <img
                  src={selectedSponsorForView.logo_url_url || selectedSponsorForView.logo_url}
                  alt={selectedSponsorForView.name}
                  className="w-12 h-12 object-contain rounded-full border-2 border-blue-500/30"
                  onError={(e) => {
                    console.error("Error loading header logo image");
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <span>Sponsor Details: {selectedSponsorForView.name}</span>
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Left Column - Logo & Website */}
              <div className={`flex flex-col items-center justify-center p-6 rounded-xl 
                ${isLight ? 'bg-gray-100 border border-gray-200' : 'bg-gray-800 border border-gray-700'} 
                shadow-lg`}>
                {console.log("Logo URLs:", {
                  logoUrl: selectedSponsorForView.logo_url,
                  logoUrlUrl: selectedSponsorForView.logo_url_url
                })}
                {(selectedSponsorForView.logo_url_url || selectedSponsorForView.logo_url) ? (
                  <img
                    src={selectedSponsorForView.logo_url_url || selectedSponsorForView.logo_url}
                    alt={selectedSponsorForView.name}
                    className="w-32 h-32 object-cover mb-4 rounded-full border-4 border-purple-500 shadow-xl"
                    onError={(e) => {
                      console.error("Error loading logo image:", e);
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/150/CCCCCC/808080?text=No+Logo';
                    }}
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center mb-4 rounded-full border-4 border-purple-500 shadow-xl bg-gray-700">
                    <FontAwesomeIcon icon={faImage} className="text-4xl text-gray-400" />
                  </div>
                )}
                {selectedSponsorForView.website && (
                  <a
                    href={selectedSponsorForView.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 ${isLight ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'} font-semibold transition-colors duration-200`}
                  >
                    <FontAwesomeIcon icon={faInfoCircle} />
                    <span>{selectedSponsorForView.website.replace(/(^https?:\/\/|\/$)/g, '')}</span>
                  </a>
                )}
              </div>

              {/* Middle Column - Key Details */}
              <div className={`p-6 rounded-xl 
                ${isLight ? 'bg-gray-100 border border-gray-200' : 'bg-gray-800 border border-gray-700'} 
                shadow-lg space-y-4 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                <div>
                  <p className="font-bold flex items-center gap-2 mb-1"><FontAwesomeIcon icon={faCrown} className="text-yellow-500" /> Sponsorship Level:</p>
                  <span className={`px-4 py-1 inline-flex text-sm font-bold rounded-full text-white ${getSponsorshipLevelColor(selectedSponsorForView.sponsorship_level)}`}>
                    {selectedSponsorForView.sponsorship_level?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-bold flex items-center gap-2 mb-1"><FontAwesomeIcon icon={faBullseye} className="text-red-500" /> Sponsorship Amount:</p>
                  <p className="text-lg font-semibold">{selectedSponsorForView.sponsorship_currency} {selectedSponsorForView.sponsorship_amount}</p>
                </div>
                <div>
                  <p className="font-bold flex items-center gap-2 mb-1"><FontAwesomeIcon icon={faShield} className="text-green-500" /> Status:</p>
                  <span className={`px-4 py-1 inline-flex text-sm font-bold rounded-full ${selectedSponsorForView.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'}`}>
                    {selectedSponsorForView.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <p className="font-bold flex items-center gap-2 mb-1"><FontAwesomeIcon icon={faRocket} className="text-purple-500" /> Period:</p>
                  <p>{new Date(selectedSponsorForView.start_date).toLocaleDateString()} to {new Date(selectedSponsorForView.end_date).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Right Column - Contact & Description */}
              <div className={`p-6 rounded-xl 
                ${isLight ? 'bg-gray-100 border border-gray-200' : 'bg-gray-800 border border-gray-700'} 
                shadow-lg space-y-4 ${isLight ? 'text-gray-800' : 'text-gray-200'}`}>
                <div>
                  <p className="font-bold flex items-center gap-2 mb-1"><FontAwesomeIcon icon={faInfoCircle} className="text-blue-500" /> Description:</p>
                  <p className="text-sm italic">{selectedSponsorForView.description || 'No description provided.'}</p>
                </div>
                <div>
                  <p className="font-bold flex items-center gap-2 mb-1"><FontAwesomeIcon icon={faUserShield} className="text-teal-500" /> Contact Person:</p>
                  <p>{selectedSponsorForView.contact_person || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-bold flex items-center gap-2 mb-1"><FontAwesomeIcon icon={faEnvelope} className="text-pink-500" /> Contact Email:</p>
                  <p>{selectedSponsorForView.contact_email || 'N/A'}</p>
                </div>
                <div>
                  <p className="font-bold flex items-center gap-2 mb-1"><FontAwesomeIcon icon={faPhone} className="text-orange-500" /> Contact Phone:</p>
                  <p>{selectedSponsorForView.contact_phone || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Displaying Images */}
            {((selectedSponsorForView.banner_image_url_url || selectedSponsorForView.banner_image_url ||
              selectedSponsorForView.promotional_image1_url_url || selectedSponsorForView.promotional_image1_url ||
              selectedSponsorForView.promotional_image2_url_url || selectedSponsorForView.promotional_image2_url ||
              selectedSponsorForView.promotional_image3_url_url || selectedSponsorForView.promotional_image3_url ||
              selectedSponsorForView.promotional_image4_url_url || selectedSponsorForView.promotional_image4_url ||
              (selectedSponsorForView.image_urls && selectedSponsorForView.image_urls.length > 0) ||
              (selectedSponsorForView.images && selectedSponsorForView.images.length > 0))) && (
                <div className={`${isLight ? 'bg-gray-100 border border-gray-200' : 'bg-gray-800 border border-gray-700'} p-6 rounded-xl shadow-lg mt-8`}>
                  <p className={`font-bold text-xl mb-4 ${isLight ? 'text-gray-800' : 'text-white'} flex items-center gap-2`}><FontAwesomeIcon icon={faImage} className="text-purple-500" /> Associated Images:</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {/* Display logo first if it exists */}
                    {(selectedSponsorForView.logo_url_url || selectedSponsorForView.logo_url) && (
                      <div className="relative">
                        <p className="absolute top-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">Logo</p>
                        <img src={selectedSponsorForView.logo_url_url || selectedSponsorForView.logo_url} alt="Logo" className="w-full h-24 object-cover rounded-md shadow-sm" />
                      </div>
                    )}
                    {(selectedSponsorForView.banner_image_url_url || selectedSponsorForView.banner_image_url) && (
                      <div className="relative">
                        <p className="absolute top-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">Banner</p>
                        <img src={selectedSponsorForView.banner_image_url_url || selectedSponsorForView.banner_image_url} alt="Banner" className="w-full h-24 object-cover rounded-md shadow-sm" />
                      </div>
                    )}
                    {(selectedSponsorForView.promotional_image1_url_url || selectedSponsorForView.promotional_image1_url) && (
                      <div className="relative">
                        <p className="absolute top-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">Promo 1</p>
                        <img src={selectedSponsorForView.promotional_image1_url_url || selectedSponsorForView.promotional_image1_url} alt="Promo 1" className="w-full h-24 object-cover rounded-md shadow-sm" />
                      </div>
                    )}
                    {(selectedSponsorForView.promotional_image2_url_url || selectedSponsorForView.promotional_image2_url) && (
                      <div className="relative">
                        <p className="absolute top-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">Promo 2</p>
                        <img src={selectedSponsorForView.promotional_image2_url_url || selectedSponsorForView.promotional_image2_url} alt="Promo 2" className="w-full h-24 object-cover rounded-md shadow-sm" />
                      </div>
                    )}
                    {(selectedSponsorForView.promotional_image3_url_url || selectedSponsorForView.promotional_image3_url) && (
                      <div className="relative">
                        <p className="absolute top-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">Promo 3</p>
                        <img src={selectedSponsorForView.promotional_image3_url_url || selectedSponsorForView.promotional_image3_url} alt="Promo 3" className="w-full h-24 object-cover rounded-md shadow-sm" />
                      </div>
                    )}
                    {(selectedSponsorForView.promotional_image4_url_url || selectedSponsorForView.promotional_image4_url) && (
                      <div className="relative">
                        <p className="absolute top-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">Promo 4</p>
                        <img src={selectedSponsorForView.promotional_image4_url_url || selectedSponsorForView.promotional_image4_url} alt="Promo 4" className="w-full h-24 object-cover rounded-md shadow-sm" />
                      </div>
                    )}
                    
                    {/* Filter additional images to exclude main image keys */}
                    {(() => {
                      // Get main image URLs to exclude from additional images
                      const mainImageUrls = [
                        selectedSponsorForView.logo_url_url || selectedSponsorForView.logo_url,
                        selectedSponsorForView.banner_image_url_url || selectedSponsorForView.banner_image_url,
                        selectedSponsorForView.promotional_image1_url_url || selectedSponsorForView.promotional_image1_url,
                        selectedSponsorForView.promotional_image2_url_url || selectedSponsorForView.promotional_image2_url,
                        selectedSponsorForView.promotional_image3_url_url || selectedSponsorForView.promotional_image3_url,
                        selectedSponsorForView.promotional_image4_url_url || selectedSponsorForView.promotional_image4_url
                      ].filter(Boolean);
                      
                      // Get additional images, filtering out main images
                      const additionalImages = (selectedSponsorForView.image_urls || [])
                        .filter(url => !mainImageUrls.includes(url));
                      
                      // Display additional images with label
                      return additionalImages.map((image, index) => (
                        <div key={index} className="relative">
                          <p className="absolute top-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">Additional {index + 1}</p>
                          <img src={image} alt={`Additional ${index + 1}`} className="w-full h-24 object-cover rounded-md shadow-sm" />
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              )}

            <div className="flex justify-end mt-8">
              <button
                onClick={() => setShowViewModal(false)}
                className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 
                  ${isLight 
                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'}`}
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Create Post Modal */}
      {showCreatePostModal && (
        <div className={`fixed inset-0 ${isLight ? 'bg-black/50' : 'bg-black/70'} backdrop-blur-sm z-50 flex items-center justify-center p-4`}>
          <div className={`${isLight 
            ? 'bg-white/95 border-2 border-orange-200' 
            : 'bg-black/95 border-2 border-orange-500/30'} backdrop-blur-xl rounded-2xl p-6 shadow-2xl max-w-2xl w-full`}>
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-2xl font-bold ${isLight 
                ? 'bg-gradient-to-r from-orange-600 to-red-600' 
                : 'bg-gradient-to-r from-orange-400 to-red-400'} bg-clip-text text-transparent`}>
                Create a Sponsored Post
              </h2>
              <button
                onClick={closeCreatePostModal}
                className={`${isLight ? 'text-gray-500 hover:text-gray-700' : 'text-gray-400 hover:text-gray-200'} transition-colors`}
                disabled={createPostLoading}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {createPostSuccess ? (
              <div className="text-center py-8">
                <FontAwesomeIcon
                  icon={faCheck}
                  className={`${isLight ? 'text-green-600' : 'text-green-400'} text-4xl mb-4`}
                />
                <p className={`text-center ${isLight ? 'text-green-600' : 'text-green-400'} font-medium`}>
                  Post created successfully!
                </p>
              </div>
            ) : (
              <form onSubmit={handleCreatePost}>
                {createPostError && (
                  <div className={`${isLight ? 'bg-red-100 text-red-600' : 'bg-red-500/20 text-red-400'} p-3 rounded-lg mb-4`}>
                    {createPostError}
                  </div>
                )}

                <div className="mb-4">
                  <label htmlFor="postTitle" className={`block mb-2 font-medium ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                    Title
                  </label>
                  <input
                    type="text"
                    id="postTitle"
                    value={postTitle}
                    onChange={(e) => setPostTitle(e.target.value)}
                    className={`w-full p-3 ${isLight 
                      ? 'bg-white/80 border-gray-300 focus:border-orange-400 focus:shadow-orange-400/25' 
                      : 'bg-black/40 border-gray-600 focus:border-orange-400 focus:shadow-orange-500/25'} border-2 rounded-xl focus:outline-none focus:shadow-lg transition-all duration-300`}
                    placeholder="Enter post title"
                    disabled={createPostLoading}
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="postContent" className={`block mb-2 font-medium ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                    Content
                  </label>
                  <textarea
                    id="postContent"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className={`w-full p-3 ${isLight 
                      ? 'bg-white/80 border-gray-300 focus:border-orange-400 focus:shadow-orange-400/25' 
                      : 'bg-black/40 border-gray-600 focus:border-orange-400 focus:shadow-orange-500/25'} border-2 rounded-xl focus:outline-none focus:shadow-lg transition-all duration-300 min-h-[150px]`}
                    placeholder="Write your post content here..."
                    disabled={createPostLoading}
                  />
                </div>

                <div className="mb-6">
                  <label className={`block mb-2 font-medium ${isLight ? 'text-gray-700' : 'text-gray-200'}`}>
                    Images (optional, max 5)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                    {selectedImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Selected ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className={`absolute top-1 right-1 ${isLight 
                            ? 'bg-red-500 hover:bg-red-600' 
                            : 'bg-red-600 hover:bg-red-700'} text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors`}
                          disabled={createPostLoading}
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={createPostLoading || selectedImages.length >= 5}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed ${isLight 
                      ? 'border-gray-300 hover:border-orange-400' 
                      : 'border-gray-600 hover:border-orange-500'} rounded-xl p-4 w-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
                      createPostLoading || selectedImages.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={createPostLoading || selectedImages.length >= 5}
                  >
                    <FontAwesomeIcon icon={faImage} className={`text-2xl mb-2 ${isLight ? 'text-gray-400' : 'text-gray-500'}`} />
                    <p className={`text-center ${isLight ? 'text-gray-600' : 'text-gray-400'}`}>
                      Click to select images
                      <br />
                      <span className="text-xs opacity-70">
                        {selectedImages.length}/5 images selected
                      </span>
                    </p>
                  </button>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeCreatePostModal}
                    className={`px-4 py-2 ${isLight 
                      ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' 
                      : 'bg-gray-800/60 hover:bg-gray-700/60 text-gray-300'} rounded-lg transition-all duration-300 cursor-pointer`}
                    disabled={createPostLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`px-4 py-2 ${isLight 
                      ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400' 
                      : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500'} text-white rounded-lg transition-all duration-300 flex items-center gap-2 cursor-pointer`}
                    disabled={createPostLoading}
                  >
                    {createPostLoading ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faPlus} />
                        <span>Create Post</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sponsors; 