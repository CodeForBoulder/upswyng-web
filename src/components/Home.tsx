import React from 'react';
import { Grid } from '@material-ui/core';
import styled from 'styled-components';
import HomeButtons from './HomeButtons';
import { Container } from '../App.styles';
import Search from './Search';

const HomeButtonsContainer = styled(Grid)`
  && {
    margin-bottom: 30px;
    margin-top: 15px;
  }
` as typeof Grid;

const Home = () => (
  <Container container justify="space-evenly">
    <Grid item xs={12}>
      <Search />
    </Grid>
    <Grid item xs={12}>
      <HomeButtonsContainer
        container
        direction="row"
        justify="space-evenly"
        spacing={8}
        className="blah"
      >
        <HomeButtons />
      </HomeButtonsContainer>
    </Grid>
  </Container>
);

export default Home;
