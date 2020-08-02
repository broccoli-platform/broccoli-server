import React, { Component } from 'react';
import { Route, Switch, Redirect } from "react-router-dom"
import { MuiThemeProvider, Container, createStyles, withStyles, createMuiTheme } from "@material-ui/core";
import {AppNav} from "@k-t-corp/frontend-lib"

import WorkersPage from "./pages/workers/WorkersPage"
import CreateWorkerPage from "./pages/workers/CreateWorkerPage"
import ModViewsPage from "./pages/modView/ModViewsPage"
import Board from "./pages/modView/ModViewPage"
import Worker from "./pages/workers/WorkerPage"
import ApiClient from "./api/ApiClient";

import withMessage from "./hoc/withMessage"
import withRouting from "./hoc/withRouting"
import withAuth from "./hoc/withAuth"
import JobsPage from "./pages/jobs/JobsPage";

function applyHoc(Component, ...hocList) {
  for (let hoc of hocList) {
    Component = hoc(Component)
  }
  return Component
}

const styles = (theme) => createStyles({
  main: {
    // top and bottom padding's
    padding: theme.spacing(4, 0, 3),
  }
});

const theme = createMuiTheme({
  palette: {
    primary: {
      light: '#439889',
      main: '#00695c',
      dark: '#003d33',
      contrastText: '#ffffff'
    },
    secondary: {
      light: '#df78ef',
      main: '#ab47bc',
      dark: '#790e8b',
      contrastText: '#ffffff'
    }
  }
});

class App extends Component {
  constructor(props) {
    super(props);
    this.apiClient = new ApiClient()
    this.state = {
      threadCount: -1
    }
  }

  componentDidMount() {
    this.apiClient.getThreadCount()
      .then(threadCount => {
        this.setState({ threadCount })
      })
  }

  render() {
    const {classes} = this.props;

    return (
      <MuiThemeProvider theme={theme}>
        <AppNav
          title='Broccoli'
          items={[
            {
              text: 'Mod Views',
              action: () => {
                window.location.replace("/modViews/view")
              }
            },
            {
              text: 'Workers',
              action: () => {
                window.location.replace("/workers/view")
              }
            },
            {
              text: 'Jobs',
              action: () => {
                window.location.replace("/jobs/view")
              }
            },
            {
              text: `Thread count: ${this.state.threadCount}`,
              action: () => {}
            },
          ]}
          rightMostItem={{
            text: "Logout",
            action: () => {
              this.apiClient.unsetAuth();
            }
          }}
        />
        <Container>
          <main className={classes.main}>
            <Switch>
              <Redirect
                exact
                from="/"
                to="/modViews/view"
              />
              <Route
                exact
                path="/modViews/view"
                component={() => {
                  const EnhancedPage = applyHoc(ModViewsPage, withMessage, withRouting, withAuth);
                  return (<EnhancedPage />)
                }}
              />
              <Route
                exact
                path="/modView/:name"
                component={() => {
                  const EnhancedPage = applyHoc(Board, withMessage, withAuth);
                  return (<EnhancedPage />)
                }}
              />
              <Route
                exact
                path="/workers/view"
                component={() => {
                  const EnhancedPage = applyHoc(WorkersPage, withMessage, withRouting, withAuth);
                  return (<EnhancedPage />)
                }}
              />
              <Route
                exact
                path="/workers/create"
                component={() => {
                  const EnhancedPage = applyHoc(CreateWorkerPage, withMessage, withRouting, withAuth);
                  return (<EnhancedPage />)
                }}
              />
              <Route
                exact
                path="/worker/:workerId"
                component={() => {
                  const EnhancedPage = applyHoc(Worker, withMessage, withAuth);
                  return (<EnhancedPage />)
                }}
              />
              <Route
                exact
                path="/jobs/view"
                component={() => {
                  const EnhancedPage = applyHoc(JobsPage, withAuth);
                  return (<EnhancedPage />)
                }}
              />
            </Switch>
          </main>
        </Container>
      </MuiThemeProvider>
    );
  }
}

export default withStyles(styles)(App);
