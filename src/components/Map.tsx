import React, { FunctionComponent, useEffect, useState } from 'react';
import IconButton, { IconButtonProps } from '@material-ui/core/IconButton';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import styled from 'styled-components';
import GoogleMapReact from 'google-map-react';

import { TResource, TStatusFetch, TGoogleMapTravelMode } from '../types';
import { colors, font } from '../App.styles';
import { BikeIcon, BusIcon, CarIcon, WalkIcon } from './Icons';
import LoadingSpinner from './LoadingSpinner';

const boulderCoordinates = {
  lat: 40.0156852,
  lng: -105.2792069
};

interface Props {
  resource: TResource;
}

const TravelButtonsContainer = styled(ButtonGroup)`
  && {
    align-items: stretch;
    box-shadow: none;
    display: flex;
    margin: ${font.helpers.convertPixelsToRems(16)} auto
      ${font.helpers.convertPixelsToRems(5)};
  }
` as typeof ButtonGroup;

interface TTravelButtonProps extends IconButtonProps {
  selected?: boolean;
}

const TravelButton: FunctionComponent<TTravelButtonProps> = ({
  selected,
  ...rest
}) => <IconButton {...rest} />;

const StyledTravelButton = styled(TravelButton)`
  && {
    background: none;
    border-radius: 0;
    color: ${(props: TTravelButtonProps) =>
      props.selected ? colors.orangePrimary : colors.white};
    flex: 1 1 auto;
  }
` as typeof TravelButton;

const MapOuterContainer = styled.div`
  margin: auto 0;
  position: relative;
  width: 100%;
  &::before {
    content: '';
    display: block;
    padding-bottom: 55%;
    width: 100%;
  }
`;

const MapInnerContainer = styled.div`
  bottom: 0;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
  & .google-map__info-window {
    background: ${colors.white};
    color: ${colors.black};
    display: block;
  }
  & .google-map__charity-name {
    font-weight: 700;
  }
  & .google-map__address-line {
    display: block;
  }
`;

const MapLoadingMask = styled.div`
  align-items: center;
  background: rgba(0, 0, 0, 0.75);
  bottom: 0;
  display: flex;
  justify-content: center;
  left: 0;
  position: absolute;
  right: 0;
  top: 0;
`;

const Map = ({ resource }: Props) => {
  const [googleMap, setGoogleMap] = useState<any | null>(null);
  const [googleMaps, setGoogleMaps] = useState<any | null>(null);
  const [fetchGoogleMapsStatus, setFetchGoogleMapsStatus] = useState<
    TStatusFetch
  >(TStatusFetch.STATUS_FETCHING);
  const [directionsRenderer, setDirectionsRenderer] = useState<any | null>(
    null
  );
  const [directionsService, setDirectionsService] = useState<any | null>(null);
  const [fetchDirectionsStatus, setFetchDirectionsStatus] = useState<
    TStatusFetch
  >(TStatusFetch.STATUS_NOT_FETCHED);
  const [travelMode, setTravelMode] = useState<TGoogleMapTravelMode | null>(
    null
  );

  const addMapMarker = () => {
    const {
      charityname,
      lat,
      lng,
      address1,
      address2,
      city,
      state,
      zip
    } = resource;

    const resourceMarker = new googleMaps.Marker({
      map: googleMap,
      title: charityname,
      position: {
        lat,
        lng
      }
    });

    const resourceMarkerInfoWindow = new googleMaps.InfoWindow({
      content: `
          <div class="google-map__info-window">
            <span class="google-map__charity-name">${charityname}</span>
            <span class="google-map__address-line">${address1}</span>
            <span class="google-map__address-line">${address2 || ''}</span>
            <span class="google-map__address-line">${city}, ${state} ${zip}</span>
          </div>
        `
    });

    resourceMarker.addListener('mouseover', () => {
      resourceMarkerInfoWindow.open(googleMap, resourceMarker);
    });
    resourceMarker.addListener('focus', () => {
      resourceMarkerInfoWindow.open(googleMap, resourceMarker);
    });
    resourceMarker.addListener('mouseout', () => {
      resourceMarkerInfoWindow.close();
    });
    resourceMarker.addListener('blur', () => {
      resourceMarkerInfoWindow.close();
    });
  };

  const getUserPosition = (): Promise<Position> =>
    new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        pos => {
          resolve(pos);
        },
        err => {
          reject(err);
        }
      );
    });

  const hideDirections = () => {
    if (!directionsRenderer) {
      return;
    }
    setTravelMode(null);
    directionsRenderer.setMap(null);
  };

  const fetchDirections = (userPosition: Position): Promise<boolean> =>
    new Promise((resolve, reject) => {
      directionsRenderer.setMap(googleMap);

      const userLatLng = new googleMaps.LatLng(
        userPosition.coords.latitude,
        userPosition.coords.longitude
      );

      // remove default markers A and B (origin/destination)
      directionsRenderer.setOptions({ suppressMarkers: true });

      try {
        directionsService.route(
          {
            origin: userLatLng,
            destination: {
              lat: resource.lat,
              lng: resource.lng
            },
            // TODO: allow updating the travel mode
            travelMode
          },
          (response: any, status: string) => {
            console.log(response);
            if (status === 'OK') {
              directionsRenderer.setDirections(response);
              resolve(true);
            } else {
              setFetchDirectionsStatus(TStatusFetch.STATUS_FETCH_ERROR);
              reject(status);
            }
          }
        );
      } catch (err) {
        setFetchDirectionsStatus(TStatusFetch.STATUS_FETCH_ERROR);
        reject(err);
      }
    });

  const placeDirections = (): Promise<boolean> =>
    new Promise(async (resolve, reject) => {
      try {
        setFetchDirectionsStatus(TStatusFetch.STATUS_FETCHING);
        const userPosition = await getUserPosition();
        await fetchDirections(userPosition);
        setFetchDirectionsStatus(TStatusFetch.STATUS_FETCH_SUCCESS);
        resolve(true);
      } catch (err) {
        setFetchDirectionsStatus(TStatusFetch.STATUS_FETCH_ERROR);
        hideDirections();
        reject(err);
      }
    });

  const handleGoogleMapApiLoaded = (googleMapObjects: {
    map: any;
    maps: any;
  }) => {
    const { map, maps } = googleMapObjects;
    setGoogleMap(map);
    setGoogleMaps(maps);
    setDirectionsRenderer(new maps.DirectionsRenderer());
    setDirectionsService(new maps.DirectionsService());
    setFetchGoogleMapsStatus(TStatusFetch.STATUS_FETCH_SUCCESS);
  };

  const handleShowDirectionsChange = async () => {
    switch (fetchDirectionsStatus) {
      case TStatusFetch.STATUS_FETCHING:
        break;
      case TStatusFetch.STATUS_FETCH_SUCCESS:
      case TStatusFetch.STATUS_FETCH_ERROR:
      case TStatusFetch.STATUS_NOT_FETCHED:
      default:
        try {
          await placeDirections();
        } catch (err) {
          console.log(err);
        }
    }
  };

  const handleDirectionButtonClick = (newTravelMode: TGoogleMapTravelMode) =>
    setTravelMode(prevTravelMode =>
      newTravelMode !== prevTravelMode ? newTravelMode : null
    );

  const { lat: resourceLat, lng: resourceLng } = resource;
  const resourceLatLng = {
    lat: resourceLat,
    lng: resourceLng
  };

  useEffect(() => {
    if (googleMaps) {
      addMapMarker();
    }
  }, [googleMaps]);

  useEffect(() => {
    if (travelMode) {
      handleShowDirectionsChange();
    } else {
      hideDirections();
    }
  }, [travelMode]);

  const MapLoadingElements = () => {
    if (
      fetchGoogleMapsStatus === TStatusFetch.STATUS_FETCHING ||
      fetchDirectionsStatus === TStatusFetch.STATUS_FETCHING
    ) {
      return (
        <MapLoadingMask>
          <LoadingSpinner />
        </MapLoadingMask>
      );
    }
    return null;
  };

  return (
    <>
      <TravelButtonsContainer variant="contained">
        <StyledTravelButton
          onClick={() => handleDirectionButtonClick('TRANSIT')}
          selected={travelMode === 'TRANSIT'}
        >
          {BusIcon}
        </StyledTravelButton>
        <StyledTravelButton
          onClick={() => handleDirectionButtonClick('BICYCLING')}
          selected={travelMode === 'BICYCLING'}
        >
          {BikeIcon}
        </StyledTravelButton>
        <StyledTravelButton
          onClick={() => handleDirectionButtonClick('DRIVING')}
          selected={travelMode === 'DRIVING'}
        >
          {CarIcon}
        </StyledTravelButton>
        <StyledTravelButton
          onClick={() => handleDirectionButtonClick('WALKING')}
          selected={travelMode === 'WALKING'}
        >
          {WalkIcon}
        </StyledTravelButton>
      </TravelButtonsContainer>
      <MapOuterContainer>
        <MapInnerContainer>
          <GoogleMapReact
            bootstrapURLKeys={{
              key: `${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
            }}
            defaultCenter={boulderCoordinates}
            defaultZoom={13}
            center={resourceLatLng}
            yesIWantToUseGoogleMapApiInternals={true}
            onGoogleApiLoaded={handleGoogleMapApiLoaded}
          />
        </MapInnerContainer>
        <MapLoadingElements />
      </MapOuterContainer>
    </>
  );
};

export default Map;
